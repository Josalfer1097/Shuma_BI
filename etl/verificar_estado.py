import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("etl/.env", override=True)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("NO ENV VARS")
    exit(1)

c = create_client(url, key)
try:
    res = c.table("etl_estado").select("*").eq("area", "logistica").execute()
    print("filas_logistica:", len(res.data))
except Exception as e:
    print("ERROR:", str(e))
