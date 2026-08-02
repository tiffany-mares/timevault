# Helper functions and constants that are used across multiple files
import psycopg2
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).parent.parent.parent / ".env")

# Various look up tables used when converting values from frontend to backend and vice versa

OFFENCE_LOOKUP = {
    "4": "4 - Offences in relation to the enemy punishable with death",
    "5": "5 - Offences in relation to the enemy not punishable with death",
    "6": "6 - Offences punishable more severely on active service than at other times",
    "7": "7 - Mutiny and sedition",
    "8": "8 - Striking or threatening superior officer",
    "9": "9 - Disobedience to superior officer",
    "10": "10 - Insubordination",
    "11": "11 - Neglect to obey garrison or other orders",
    "12": "12 - Desertion",
    "13": "13 - Fraudulent enlistment",
    "14": "14 - Assistance of or connivance at desertion",
    "15": "15 - Absence from duty without leave",
    "16": "16 - Scandalous conduct of officer",
    "17": "17 - Fraud by persons in charge of money or goods",
    "18": "18 - Disgraceful conduct of soldier",
    "19": "19 - Drunkenness",
    "20": "20 - Permitting escape of person in custody",
    "21": "21 - Irregular arrest or confinement",
    "22": "22 - Escape from confinement",
    "23": "23 - Corrupt dealings in respect of supplies to forces",
    "24": "24 - Deficiency in and injury to equipment",
    "25": "25 - Falsifying official documents and false declarations",
    "26": "26 - Neglect to report and signing in blank",
    "27": "27 - False accusation or false statement by soldier",
    "28": "28 - Offences in relation to courts martial",
    "29": "29 - False evidence",
    "30": "30 - Offences in relation to billeting",
    "31": "31 - Offences in relation to the impressment of carriages and their attendants",
    "32": "32 - Enlistment of soldier or sailor discharged with ignominy or disgrace",
    "33": "33 - False answers or declarations on enlistment",
    "34": "34 - General offences in relation to enlistment",
    "35": "35 - Traitorous words",
    "36": "36 - Injurious disclosures",
    "37": "37 - Ill-treating soldier",
    "38": "38 - Duelling and attempting to commit suicide",
    "39": "39 - Refusal to deliver to civil power officers and soldiers accused of civil offences",
    "40": "40 - Conduct to prejudice of military discipline",
    "41": "41 - Offences punishable by ordinary law of England (or the Canadian civil court)",
    "155": "155 - Penalty on trafficking in commissions",
}

COURT_MARTIAL_COLS = {'Rank', 'Unit_Type', 'Enlistment_Year'}
ENLISTMENT_COLS = {'Year_of_Birth', 'Place_of_Birth', 'Occupation', 'Marital_Status'}

KNOWN_BIRTHPLACES = {'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'England', 'United States'}

BIRTHPLACE_FRONTEND_TO_DB = {'USA': 'United States'}

BIRTHPLACE_DB_TO_FRONTEND = {'United States': 'USA'}

MARITAL_STATUS_FRONTEND_TO_DB = {'Married': 'Yes', 'Single': ['No', 'Single']}

MARITAL_STATUS_DB_TO_FRONTEND = {'Yes': 'Married', 'No': 'Single', 'Single': 'Single'}

# This function establishes connection to the database
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", 5432)
    )

# Helper function that converts offence display names to codes for DB querying.
def parse_offence_codes(offence_names: list[str]) -> list[str]:
    return [name.split("-")[0].strip() for name in offence_names]

# Helper function that converts offence codes to display names for the frontend.
def codes_to_names(codes: list[str]) -> list[str]:
    return [OFFENCE_LOOKUP.get(code.strip(), code) for code in codes]

# Helper function that splits a multi-code offence string into individual codes
def parse_multi_offence(offence_str: str) -> list[str]:
    return [code.strip() for code in offence_str.split(",")]

# Helper function that translates the frontend marital status option to the appropriate corresponding backend version
def preprocess_values(values: list[str], col: str) -> list[str]:
    if col == 'Marital_Status':
        translated = []
        for v in values:
            db_val = MARITAL_STATUS_FRONTEND_TO_DB.get(v, v)
            if isinstance(db_val, list):
                translated.extend(db_val)
            else:
                translated.append(db_val)
        return translated
    return values

# Helper function that returns the standard JOIN clause between ww1_enlistment and ww1_court_martial
def _join_clause() -> str:
    return """
        FROM ww1_enlistment e
        JOIN ww1_court_martial c ON e.LName = c.LName
        AND (
            (c.Rank IN ('Lieutenant', 'Captain', 'Major', 'Colonel', 'General')
                AND e.FName = c.FName)
            OR e.Regiment_number = c.Regiment_number
        )
    """

# Helper function that returns the EXISTS subquery for filtering offences
def _offence_exists_clause(offence_placeholders: str) -> str:
    return f"""
        AND EXISTS (
            SELECT 1 FROM unnest(string_to_array(c.Offence, ', ')) AS code
            WHERE code IN ({offence_placeholders})
        )
    """

# Helper function that converts a raw DB offence string to frontend display names, filtered to queried codes only
def _resolve_offence_str(offence_str: str, offence_codes_set: set) -> str:
    return ", ".join(
        OFFENCE_LOOKUP.get(code, code)
        for code in parse_multi_offence(offence_str)
        if code in offence_codes_set
    )
