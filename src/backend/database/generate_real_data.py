#This file will read the WW1_enlistment and WW1_court_martials datasets and use them to produce a .sql file to populate the schema
import csv
from pathlib import Path

FIRST_INPUT_FILE = Path(__file__).parent / "Canadian_WWI_Cleaned.csv"
FIRST_OUTPUT_FILE = Path(__file__).parent / "ww1_enlistment_data.sql"

SECOND_INPUT_FILE = Path(__file__).parent / "Courts_Martial_WWI_Cleaned.csv"
SECOND_OUTPUT_FILE = Path(__file__).parent / "ww1_courts_martial_data.sql"

def generate_ww1_enlistment():
    with open(FIRST_INPUT_FILE, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)

    with open(FIRST_OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("INSERT INTO ww1_enlistment (FName, Minit, LName, Regiment_number, Rank, Enlistment_Year, Year_of_Birth, Place_of_Birth, Occupation, Marital_Status) VALUES\n")

        for i, row in enumerate(rows):
            def escape(val):
                if not val or val.strip() == '':
                    return "NULL"
                return "'" + val.strip().replace("'", "''") + "'"

            def escape_int(val):
                if not val or val.strip() == '':
                    return "NULL"
                return str(int(float(val)))

            values = f"({escape(row['First_name'])}, {escape(row['Middle_init'])}, {escape(row['Last_name'])}, {escape_int(row['Regimental_number'])}, {escape(row['Rank'])}, {escape_int(row['Enlistment_year'])}, {escape_int(row['Birth_year'])}, {escape(row['Birthplace'])}, {escape(row['Occupation'])}, {escape(row['Marital_status'])})"

            if i < len(rows) - 1:
                f.write(values + ",\n")
            else:
                f.write(values + ";\n")

    print(f"Done! {len(rows)} rows written to {SECOND_OUTPUT_FILE}")

def generate_ww1_court_martial():
    with open(SECOND_INPUT_FILE, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)

    with open(SECOND_OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("INSERT INTO ww1_court_martial (FName, Minit, LName, Enlistment_Year, Rank, Regiment_number, Unit_Type, Offence) VALUES\n")
        for i, row in enumerate(rows):
            def escape(val):
                if not val or val.strip() == '':
                    return "NULL"
                return "'" + val.strip().replace("'", "''") + "'"

            def escape_int(val):
                if not val or val.strip() == '':
                    return "NULL"
                return str(int(float(val)))

            values = (
                f"({escape(row['first_name'])}, {escape(row['middle_init'])}, {escape(row['last_name'])}, "
                f"{escape_int(row['Enlistment_year'])}, {escape(row['Rank'])}, "
                f"{escape_int(row['Regimental number'])}, {escape(row['Unit Type'])}, {escape(row['Offence'])})"
            )

            if i < len(rows) - 1:
                f.write(values + ",\n")
            else:
                f.write(values + ";\n")

    print(f"Done! {len(rows)} rows written to {SECOND_OUTPUT_FILE}")

if __name__ == "__main__":
    generate_ww1_enlistment()
    generate_ww1_court_martial()
