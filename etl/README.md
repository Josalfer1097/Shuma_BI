# ETL — Delivery Times Pipeline

Moves aggregated delivery time metrics from Oracle into Supabase every night.
The frontend only ever reads from Supabase, so Oracle is never exposed to
the internet.

It supports multiple companies running the same ERP schema on different
databases (e.g. CFS and Acabados). Each company runs in its own process and
writes its own rows.

## How it works

1. Connects to Oracle with a **read-only** user.
2. Runs the zone-by-month aggregation query.
3. Excludes "dormant" quotes (those that took more than a set amount of days
   to leave the warehouse, usually 30). This prevents forgotten quotes from
   skewing the operational metrics.
4. **Upserts** the results into `reporte_tiempos_zona_mes`.
5. Removes rows that no longer exist in the source for that specific company.
6. Records the run outcome in `etl_status`.

Data always covers up to **yesterday** (D-1). The query cuts at
`FECHA_RUTA < TRUNC(SYSDATE)`, so a partially-complete current day never
skews the numbers.

## Why a full refresh, not incremental

Quotes get validated late. A delivery from March can be closed in July,
which retroactively changes March's median. Recalculating the whole range
each night is both simpler and more correct than appending yesterday's rows.

## Safety guards

| Guard | What it prevents |
|---|---|
| Upsert instead of delete + insert | The table is never momentarily empty. A crash mid-run can't blank the dashboard. |
| Minimum row threshold (`ETL_MIN_FILAS`) | If Oracle returns suspiciously few rows, the run aborts without touching Supabase. Yesterday's data beats broken data. |
| Read-only Oracle user | The ETL cannot write to production, by design. |
| Connection and query timeouts | A hung connection can't leave the job running for hours. |
| Paginated delete | Deleting obsolete rows fetches IDs in chunks to avoid silent Supabase limits (1,000 rows). |

## Setup

### 1. Create the read-only Oracle user

Run `../sql/01_oracle_readonly_user.sql` as DBA on each company's database. Change the password first.

### 2. Create the Supabase tables

Run `../sql/02_supabase_schema.sql` in the Supabase SQL Editor.

Get the **service role key** from Project Settings → API. The ETL needs it to
write. Never put this key in the frontend.

### 2.5 — Instalar el Oracle Instant Client

**Solo para correr el ETL fuera de Docker.** En el contenedor ya viene.

La base es Oracle 11.2 y python-oracledb necesita el modo thick para
conectarse. Requiere el Instant Client **19c**: las versiones 21c y 23ai
ya no soportan bases 11.2.

1. Descarga el **Basic Light Package (ZIP)** version 19.x desde
   https://www.oracle.com/database/technologies/instant-client/downloads.html
2. Descomprime en una ruta sin espacios ni acentos, por ejemplo
   `C:\oracle\instantclient_19_28`
3. Verifica que `oci.dll` este directamente en esa carpeta, no anidado
4. Define `ORACLE_CLIENT_DIR` en el `.env` con esa ruta

Si al correr aparece `DPY-3010`, es que falta este paso.

### 3. Configure

```bash
cp .env.example .env
```

Fill in the Oracle and Supabase values. Add your companies to `ETL_EMPRESAS`.
Prefix each Oracle variable with the company name, e.g. `ORACLE_CFS_USER`.

### 4. Run it

```bash
docker compose up -d --build
```

This builds the image and schedules it nightly. Check `crontab.txt` for the
exact times (e.g. 5:00 AM for CFS, 5:15 AM for Acabados).

To run manually for testing:
```bash
python etl.py --empresa cfs --dry-run
python etl.py --empresa cfs --check
```

### 5. Verify

```bash
docker logs -f etl-tiempos-entrega
```

Or query `etl_status` in Supabase. It should read `estado = 'OK'` with a
recent `ultima_corrida`.

## Environment variables

| Variable | Purpose |
|---|---|
| `ETL_EMPRESAS` | Comma-separated list of companies (e.g. `cfs,acabados`) |
| `ORACLE_<EMP>_USER` | Read-only user for a specific company |
| `ORACLE_<EMP>_PASSWORD` | Its password |
| `ORACLE_<EMP>_DSN` | `host:port/service_name` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_KEY` | Service role key — write access |
| `ETL_FECHA_INICIO` | Start of the analysis window. Default `2025-01-01` |
| `ETL_MIN_FILAS` | Abort threshold. Default `10` |
| `ETL_DIAS_DORMANCIA` | Threshold to exclude dormant quotes. Default `30` |
