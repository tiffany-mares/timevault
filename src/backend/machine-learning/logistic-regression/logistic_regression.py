import json
import os, sys
import shutil
import argparse
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, accuracy_score, roc_auc_score

RANDOM_STATE = 42
TEST_SIZE = 0.2

FEATURE_NAME_MAP = {
    "Rank": "Rank",
    "Birthplace": "Place_of_Birth",
    "Occupation":  "Occupation",
    "Marital Status": "Marital_Status",
    "Enlistment Year": "Enlistment_Year",
    "Birth Year": "Year_of_Birth",
    "Unit Type":  "Unit_Type",
}

ALL_REFERENCE_CATEGORIES = {
    "Rank": "Cadet",
    "Place_of_Birth": "Other",
    "Occupation": "Transportation & Rail",
    "Marital_Status": "Widowed",
}

ALL_CATEGORICAL = [
    "Rank", "Place_of_Birth", "Occupation", "Marital_Status",
    "Enlistment_Year", "Year_of_Birth", "Unit_Type",
]
ALL_NUMERICAL  = []

BIRTH_YEAR_BINS = [1869, 1874, 1879, 1884, 1889, 1894, 1900]
BIRTH_YEAR_LABELS = ["1870-1874", "1875-1879", "1880-1884", "1885-1889", "1890-1894", "1895-1900"]


_COL_MAP = {
    "fname": "FName", "minit": "Minit", "lname": "LName",
    "regiment_number": "Regiment_number", "rank": "Rank",
    "enlistment_year": "Enlistment_Year", "year_of_birth": "Year_of_Birth",
    "place_of_birth": "Place_of_Birth", "occupation": "Occupation",
    "marital_status": "Marital_Status", "unit_type": "Unit_Type",
    "offence": "Offence",
}

def load_from_database():
    try:
        import psycopg2
        from dotenv import load_dotenv

        env_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".env")
        load_dotenv(env_path)

        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 5432)),
            dbname=os.getenv("DB_NAME", "ww1_db"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", ""),
        )
        enlistment = pd.read_sql("SELECT * FROM ww1_enlistment", conn)
        court_martial = pd.read_sql("SELECT regiment_number, unit_type FROM ww1_court_martial", conn)
        conn.close()
        enlistment.rename(columns=_COL_MAP, inplace=True)
        court_martial.rename(columns=_COL_MAP, inplace=True)
        unit_map = court_martial.dropna(subset=["Unit_Type"]).drop_duplicates(subset=["Regiment_number"])
        enlistment = enlistment.merge(unit_map[["Regiment_number", "Unit_Type"]], on="Regiment_number", how="left")
        enlistment["Unit_Type"] = enlistment["Unit_Type"].fillna("Unknown")
        return enlistment, court_martial[["Regiment_number"]]
    except Exception:
        return None, None


def load_from_generator():
    gen_path = os.path.join(os.path.dirname(__file__), '..', '..', 'database')
    sys.path.insert(0, os.path.abspath(gen_path))
    import generate_sample_data as gen

    enlistment = pd.DataFrame(gen.enlistment_records, columns=[
        'FName','Minit','LName','Regiment_number','Rank',
        'Enlistment_Year','Year_of_Birth','Place_of_Birth',
        'Occupation','Marital_Status', 'Unit_Type',
    ]  )
    court_martial = pd.DataFrame(gen.court_martial_records, columns=[
        'FName','Minit','LName','Regiment_number','Rank',
        'Unit_Type','Enlistment_Year','Offence',
    ])
    return enlistment, court_martial[['Regiment_number']]

def build_labelled_dataset(enlistment, court_martial):
    cm_ids = set(court_martial['Regiment_number'].unique())
    enlistment['court_martialled'] = enlistment['Regiment_number'].apply(
        lambda r: 1 if r in cm_ids else 0)
    return enlistment

def resolve_features(feature_names):
    if feature_names is None:
        return list(ALL_CATEGORICAL), list(ALL_NUMERICAL), dict(ALL_REFERENCE_CATEGORIES)

    cat_cols, num_cols, ref_cats = [], [], {}
    for name in feature_names:
        col = FEATURE_NAME_MAP.get(name)
        if col is None:
            print(f"Warning: unknown feature '{name}', skipping")
            continue

        if col in ALL_CATEGORICAL:
            cat_cols.append(col)
            if col in ALL_REFERENCE_CATEGORIES:
                ref_cats[col] = ALL_REFERENCE_CATEGORIES[col]
        elif col in ALL_NUMERICAL:
            num_cols.append(col)
    return cat_cols, num_cols, ref_cats

def encode_features(df, cat_features, num_features, ref_categories):
    parts = []
    if cat_features:
        cat_df = df[cat_features].copy()
        for col in cat_df.columns:
            if cat_df[col].dtype != 'object':
                cat_df[col] = cat_df[col].astype(str)
        one_hot = pd.get_dummies(cat_df, dtype=int)

        # drop reference category columns so they don't skew coefficients
        ref_cols = [f"{feat}_{val}" for feat,val in ref_categories.items()]
        ref_cols = [c for c in ref_cols if c in one_hot.columns]
        one_hot = one_hot.drop(columns=ref_cols)
        parts.append(one_hot)

    scaler = None
    if num_features:
        numerical = df[num_features].copy()
        scaler = StandardScaler()
        numerical[num_features] = scaler.fit_transform(numerical)
        parts.append(numerical)

    X = pd.concat(parts, axis=1)
    return X, scaler

def format_feature_name(col_name, cat_features):
    for cat in cat_features:
        prefix = cat + "_"
        if col_name.startswith(prefix):
            value = col_name[len(prefix):]
            label = cat.replace("_", " ")
            if label == "Place of Birth":
                label = "Birthplace"
            elif label == "Enlistment Year":
                label = "Enlistment Year"
            elif label == "Year of Birth":
                label = "Birth Year"
            elif label == "Unit Type":  label = "Unit Type"
            return f"{label}: {value}"
    return col_name


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run logistic regression on WWI court martial data"
    )
    parser.add_argument("--features", type=str, default=None,
        help="Comma-separated feature list, e.g. 'Rank,Birthplace,Enlistment Year'")
    return parser.parse_args()


def run(selected_feature_names=None):
    cat_features, num_features, ref_categories = resolve_features(selected_feature_names)
    if not cat_features and not num_features:
        return {"error": "No valid features selected."}

    friendly_names = selected_feature_names or list(FEATURE_NAME_MAP.keys())
    print(f"Features: {', '.join(friendly_names)}")
    print("Loading data...")

    enlistment, court_martial = load_from_database()
    if enlistment is None:
        print("Database unavailable, regenerating sample data in memory.")
        enlistment, court_martial = load_from_generator()

    df = build_labelled_dataset(enlistment, court_martial)
    positive = df['court_martialled'].sum()
    total = len(df)
    print(f"Dataset: {total} soldiers, {positive} court-martialled ({positive/total*100:.1f}%)")

    if "Year_of_Birth" in cat_features:
        df["Year_of_Birth"] = pd.cut(
            df["Year_of_Birth"], bins=BIRTH_YEAR_BINS, labels=BIRTH_YEAR_LABELS
        )

    X, scaler = encode_features(df, cat_features, num_features, ref_categories)
    y = df['court_martialled']
    feature_names = list(X.columns)
    print(f"Feature columns: {len(feature_names)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE)
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    model = LogisticRegression(
        class_weight='balanced', max_iter=1000, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    print("Model trained.")

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    precision = round(precision_score(y_test, y_pred), 4)
    recall = round(recall_score(y_test, y_pred), 4)
    acc = round(accuracy_score(y_test, y_pred), 4)
    auc = round(roc_auc_score(y_test, y_prob), 4)
    print(f"Precision: {precision}  Recall: {recall}  Accuracy: {acc}  AUC: {auc}")

    # sort coefficients by magnitude
    raw_coefficients = list(zip(feature_names, model.coef_[0]))
    raw_coefficients.sort(key=lambda x: abs(x[1]), reverse=True)
    coefficients = [
        {"feature": format_feature_name(name, cat_features), "value": round(float(val), 4)}
        for name, val in raw_coefficients
    ]

    results = {
        "features_used": friendly_names,
        "coefficients": coefficients,
        "metrics": {
            "precision": precision, "recall": recall,
            "accuracy": acc, "auc": auc,
        },
        "model_details": {
            "encoding": "one-hot",
            "feature_columns": len(feature_names),
            "class_weight": "balanced",
            "max_iter": 1000,
            "reference_categories": {
                k.lower().replace("_"," "): v for k, v in ref_categories.items()
            },
            "train_size": len(X_train),
            "test_size": len(X_test),
            "total_soldiers": total,
            "court_martialled_count": int(positive),
            "court_martial_rate": round(positive/total, 4),
        },
    }

    out_path = os.path.join(os.path.dirname(__file__), 'results.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {out_path}")

    fe_data = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend', 'data')
    os.makedirs(fe_data, exist_ok=True)
    fe_copy = os.path.join(fe_data, 'logistic_regression_results.json')
    shutil.copy(out_path, fe_copy)
    print(f"Copied to {fe_copy}")

    return results

if __name__ == "__main__":
    args = parse_args()
    feat_list = None
    if args.features:
        feat_list = [f.strip() for f in args.features.split(",")]
    run(feat_list)
