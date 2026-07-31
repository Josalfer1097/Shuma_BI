# ETL — Delivery Times Pipeline

Moves aggregated delivery time metrics from Oracle (`SGE_CFS_PROD`) into
Supabase every night. The frontend only ever reads from Supabase, so Oracle
is never exposed to the internet.

## How it works

1. Connects to Oracle with a **read-only** user.
2. Runs the zone-by-month aggregation query (`../sql/03_query_zona_mes.sql`).
3. **Upserts** the results into `reporte_tiempos_zona_mes`.
4. Removes rows that no longer exist in the source.
5. Records the run outcome in `etl_status`.

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

## Setup

### 1. Create the read-only Oracle user

Run `../sql/01_oracle_readonly_user.sql` as DBA. Change the password first.

### 2. Create the Supabase tables

Run `../sql/02_supabase_schema.sql` in the Supabase SQL Editor.

Get the **service role key** from Project Settings → API. The ETL needs it to
write. Never put this key in the frontend.

### 3. Configure

```bash
cp .env.example .env
```

Fill in the Oracle and Supabase values.

### 4. Run it

```bash
docker compose up -d --build
```

This builds the image, runs the ETL **once immediately** so you can verify
the connection works, then schedules it nightly at **5:00 AM Mexico City
time**.

### 5. Verify

```bash
docker logs -f etl-tiempos-entrega
```

Or query `etl_status` in Supabase. It should read `estado = 'OK'` with a
recent `ultima_corrida`.

## Changing the schedule

Edit `crontab.txt` (standard cron format), then rebuild:

```bash
docker compose up -d --build
```

## Environment variables

| Variable | Purpose |
|---|---|
| `ORACLE_USER` | Read-only user created in step 1 |
| `ORACLE_PASSWORD` | Its password |
| `ORACLE_DSN` | `host:port/service_name` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_KEY` | Service role key — write access |
| `ETL_FECHA_INICIO` | Start of the analysis window. Default `2025-01-01` |
| `ETL_MIN_FILAS` | Abort threshold. Default `10` |
