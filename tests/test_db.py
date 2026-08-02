import sys, os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", ".env")
env_path = os.path.normpath(env_path)
print(f".env path: {env_path}")
print(f".env exists: {os.path.exists(env_path)}")

load_dotenv(env_path)

import psycopg2
conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=os.getenv("DB_PORT")
)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM ww1_enlistment")
print(f"Enlistment rows: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM ww1_court_martial")
print(f"Court martial rows: {cur.fetchone()[0]}")

# Run the canonical join query (columns are lowercase in PG)
cur.execute("""
SELECT COUNT(*) FROM ww1_enlistment e
JOIN ww1_court_martial c ON e.lname = c.lname
AND (
    (c.rank IN ('Brigadier-General','Colonel','Lt-Colonel','Major','Captain','Lieutenant','2nd Lieutenant','Cadet')
     AND e.fname = c.fname)
    OR (e.regiment_number = c.regiment_number)
)
""")
print(f"DB join matches (with dupes): {cur.fetchone()[0]}")

cur.execute("""
SELECT COUNT(DISTINCT (e.fname, e.lname, e.regiment_number)) FROM ww1_enlistment e
JOIN ww1_court_martial c ON e.lname = c.lname
AND (
    (c.rank IN ('Brigadier-General','Colonel','Lt-Colonel','Major','Captain','Lieutenant','2nd Lieutenant','Cadet')
     AND e.fname = c.fname)
    OR (e.regiment_number = c.regiment_number)
)
""")
print(f"DB join matches (distinct enlistees): {cur.fetchone()[0]}")
conn.close()

# Now test the CSV join logic (using the rename logic from decision-tree.py)
import pandas as pd

db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "database")
enlistment = pd.read_csv(os.path.join(db_dir, "Canadian_WWI_Cleaned.csv"))
court_martial = pd.read_csv(os.path.join(db_dir, "Courts_Martial_WWI_Cleaned.csv"))

# Rename to standard names (same as decision-tree.py)
enlistment = enlistment.rename(columns={"First_name": "FName", "Last_name": "LName", "Regimental_number": "Regiment_number"})
court_martial = court_martial.rename(columns={"first_name": "FName", "last_name": "LName", "Regimental number": "Regiment_number"})
enlistment["Regiment_number"] = pd.to_numeric(enlistment["Regiment_number"], errors="coerce")
court_martial["Regiment_number"] = pd.to_numeric(court_martial["Regiment_number"], errors="coerce")

print(f"\nCSV enlistment rows: {len(enlistment)}")
print(f"CSV court martial rows: {len(court_martial)}")

officer_ranks = {"Brigadier-General","Colonel","Lt-Colonel","Major","Captain","Lieutenant","2nd Lieutenant","Cadet"}

cm_regiment_keys = set()
cm_officer_names = set()

for _, row in court_martial.iterrows():
    lname = str(row.get("LName", "")).strip().lower() if pd.notna(row.get("LName")) else ""
    fname = str(row.get("FName", "")).strip().lower() if pd.notna(row.get("FName")) else ""
    reg = row.get("Regiment_number")
    rank = str(row.get("Rank", "")).strip()
    
    if lname and pd.notna(reg):
        cm_regiment_keys.add((lname, reg))
    if rank in officer_ranks and lname and fname:
        cm_officer_names.add((lname, fname))

print(f"CM regiment keys: {len(cm_regiment_keys)}")
print(f"CM officer names: {len(cm_officer_names)}")

matches = 0
for _, row in enlistment.iterrows():
    lname = str(row.get("LName", "")).strip().lower() if pd.notna(row.get("LName")) else ""
    fname = str(row.get("FName", "")).strip().lower() if pd.notna(row.get("FName")) else ""
    reg = row.get("Regiment_number")
    
    if not lname:
        continue
    if (lname, fname) in cm_officer_names:
        matches += 1
    elif pd.notna(reg) and (lname, reg) in cm_regiment_keys:
        matches += 1

print(f"CSV join matches: {matches}")
