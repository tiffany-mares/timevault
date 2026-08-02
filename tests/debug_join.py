import importlib.util, sys, os
import pandas as pd

# Load the module
spec = importlib.util.spec_from_file_location('dt', 'decision-tree.py')
dt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dt)

# Load DB data
enlistment_df, court_martial_df = dt.load_data()

# Check Regiment_number types
print("Enlistment Regiment_number dtype:", enlistment_df["Regiment_number"].dtype)
print("Court Martial Regiment_number dtype:", court_martial_df["Regiment_number"].dtype)
print("Enlistment sample:", enlistment_df["Regiment_number"].dropna().head(5).tolist())
print("Court Martial sample:", court_martial_df["Regiment_number"].dropna().head(5).tolist())

# Check a specific regiment_number match
e_regs = set(enlistment_df["Regiment_number"].dropna().unique())
cm_regs = set(court_martial_df["Regiment_number"].dropna().unique())
overlap = e_regs & cm_regs
print(f"\nEnlistment unique regs: {len(e_regs)}")
print(f"CM unique regs: {len(cm_regs)}")
print(f"Overlapping regs: {len(overlap)}")

# Check LName types
print(f"\nEnlistment LName dtype: {enlistment_df['LName'].dtype}")
print(f"CM LName dtype: {court_martial_df['LName'].dtype}")
print(f"Enlistment LName sample: {enlistment_df['LName'].head(3).tolist()}")
print(f"CM LName sample: {court_martial_df['LName'].head(3).tolist()}")

# Manual join count
officer_ranks = {
    "Brigadier-General", "Colonel", "Lt-Colonel", "Major",
    "Captain", "Lieutenant", "2nd Lieutenant", "Cadet",
}

cm = court_martial_df.copy()
cm_regiment_keys = set()
cm_officer_names = set()

for _, row in cm.iterrows():
    lname = str(row["LName"]).strip().lower() if pd.notna(row.get("LName")) else ""
    fname = str(row["FName"]).strip().lower() if pd.notna(row.get("FName")) else ""
    reg = row.get("Regiment_number")
    rank = str(row.get("Rank", "")).strip()
    
    if lname and pd.notna(reg):
        cm_regiment_keys.add((lname, reg))
    if rank in officer_ranks and lname and fname:
        cm_officer_names.add((lname, fname))

print(f"\nCM regiment keys: {len(cm_regiment_keys)}")
print(f"CM officer names: {len(cm_officer_names)}")

# Check a few specific keys
sample_cm_keys = list(cm_regiment_keys)[:3]
print(f"Sample CM regiment keys: {sample_cm_keys}")
print(f"Sample types: {[(type(k[0]), type(k[1])) for k in sample_cm_keys]}")

# Check if any enlistment records match
match_count = 0
for _, row in enlistment_df.head(1000).iterrows():
    lname = str(row["LName"]).strip().lower() if pd.notna(row["LName"]) else ""
    fname = str(row["FName"]).strip().lower() if pd.notna(row["FName"]) else ""
    reg = row["Regiment_number"]
    
    if not lname:
        continue
    if (lname, fname) in cm_officer_names:
        match_count += 1
    elif pd.notna(reg) and (lname, reg) in cm_regiment_keys:
        match_count += 1

print(f"\nFirst 1000 enlistment matches: {match_count}")

# Check specific type comparison
if sample_cm_keys:
    key = sample_cm_keys[0]
    lname_val = key[0]
    reg_val = key[1]
    # Find this in enlistment
    mask = enlistment_df["LName"].str.strip().str.lower() == lname_val
    matching_rows = enlistment_df[mask]
    if len(matching_rows) > 0:
        e_reg = matching_rows.iloc[0]["Regiment_number"]
        print(f"\nCM key: ({lname_val!r}, {reg_val!r}) type=({type(reg_val).__name__})")
        print(f"Enlistment reg: {e_reg!r} type=({type(e_reg).__name__})")
        print(f"Equal? {e_reg == reg_val}")
