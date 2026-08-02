"""
Decision Tree Model for predicting court martial from soldier enlistment profiles.

Loads all enlistment data from ww1_enlistment (57,319 soldiers) and the pre-joined
court-martialled soldiers from joined_courtmartialled_soldiers (898 soldiers).
Labels each enlistment record as court-martialled (1) or not (0), then trains a
DecisionTreeClassifier and returns the tree structure, metrics, and findings.

The model is trained with class_weight='balanced' to handle the imbalanced dataset,
ensuring it learns to identify features of court-martialled soldiers rather than defaulting to the majority.
To do this we use the .fit method of the scikit-learn DecisionTreeClassifier with parameters
like max_depth and min_samples_leaf to prevent overfitting, given the small dataset size.
"""

import os
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, accuracy_score


# Column name mapping from DB (lowercase) to pipeline standard
_DB_COL_MAP = {
    "fname": "FName", "minit": "Minit", "lname": "LName",
    "regiment_number": "Regiment_number", "rank": "Rank",
    "enlistment_year": "Enlistment_Year", "year_of_birth": "Year_of_Birth",
    "place_of_birth": "Place_of_Birth", "occupation": "Occupation",
    "marital_status": "Marital_Status",
}


# ---------------------------------------------------------------------------------------------------------------------------------
# 1. Data loading - reads from PostgreSQL (joined_courtmartialled_soldiers table)
# ---------------------------------------------------------------------------------------------------------------------------------

def _get_db_connection():
    """Get a PostgreSQL connection using .env credentials."""
    import psycopg2
    from dotenv import dotenv_values

    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".env")
    env = dotenv_values(env_path)

    return psycopg2.connect(
        host=env.get("DB_HOST", "localhost"),
        port=int(env.get("DB_PORT", 5432)),
        user=env.get("DB_USER", "postgres"),
        password=env.get("DB_PASSWORD", ""),
        dbname=env.get("DB_NAME", "ww1_db"),
    )


def _normalise_df(df):
    """Rename lowercase DB columns to pipeline standard and coerce numeric types."""
    df = df.rename(columns=_DB_COL_MAP)
    df["Regiment_number"] = pd.to_numeric(df["Regiment_number"], errors="coerce")
    df["Enlistment_Year"] = pd.to_numeric(df["Enlistment_Year"], errors="coerce")
    df["Year_of_Birth"] = pd.to_numeric(df["Year_of_Birth"], errors="coerce")
    return df


def load_data():
    """
    Load all enlistment soldiers and the pre-joined court-martialled soldiers
    from the database.  Returns (enlistment_df, court_martialled_df).
    """
    conn = _get_db_connection()

    enlistment_df = _normalise_df(pd.read_sql("SELECT * FROM ww1_enlistment", conn))
    court_martialled_df = _normalise_df(pd.read_sql("SELECT * FROM joined_courtmartialled_soldiers", conn))

    conn.close()
    print(f"Loaded from PostgreSQL: {len(enlistment_df)} enlistment, {len(court_martialled_df)} court-martialled")
    return enlistment_df, court_martialled_df


# ---------------------------------------------------------------------------
# 2. Prepare the dataset: label soldiers using the joined table, encode features
# ---------------------------------------------------------------------------

# Map frontend display names to internal column names
_FEATURE_NAME_MAP = {
    "Rank": "Rank",
    "Birthplace": "Place_of_Birth",
    "Occupation": "Occupation",
    "Marital Status": "Marital_Status",
    "Enlistment Year": "Enlistment_Year",
    "Birth Year": "Year_of_Birth",
}

ALL_FEATURE_COLS = ["Rank", "Place_of_Birth", "Occupation", "Marital_Status",
                    "Enlistment_Year", "Year_of_Birth"]


def _resolve_features(selected_features=None):
    """Convert frontend feature names to internal column names."""
    if selected_features is None:
        return ALL_FEATURE_COLS[:]
    return [_FEATURE_NAME_MAP[f] for f in selected_features if f in _FEATURE_NAME_MAP]


def prepare_dataset(enlistment_df, court_martialled_df, feature_cols=None):
    """
    Label each enlistment soldier as court-martialled (1) or not (0) by checking
    membership in the joined_courtmartialled_soldiers table.

    feature_cols: list of internal column names to use. Defaults to all 6.
    """
    if feature_cols is None:
        feature_cols = ALL_FEATURE_COLS[:]

    enlistment_df = enlistment_df.copy()

    # Build a set of (lname, fname, regiment_number) tuples from the joined table
    cm_keys = set()
    for _, row in court_martialled_df.iterrows():
        key = (
            str(row["LName"]).strip().lower() if pd.notna(row["LName"]) else "",
            str(row["FName"]).strip().lower() if pd.notna(row["FName"]) else "",
            row["Regiment_number"],
        )
        cm_keys.add(key)

    def _is_court_martialled(row):
        key = (
            str(row["LName"]).strip().lower() if pd.notna(row["LName"]) else "",
            str(row["FName"]).strip().lower() if pd.notna(row["FName"]) else "",
            row["Regiment_number"],
        )
        return 1 if key in cm_keys else 0

    enlistment_df["court_martialled"] = enlistment_df.apply(_is_court_martialled, axis=1)

    # Select only the feature columns + label
    df = enlistment_df[feature_cols + ["court_martialled"]].copy()

    # Clean up marital status values ("Yes"→"Married", "No"→"Not Married")
    if "Marital_Status" in feature_cols:
        df["Marital_Status"] = df["Marital_Status"].replace({"Yes": "Married", "No": "Not Married"})

    categorical_cols = [c for c in ["Rank", "Place_of_Birth", "Occupation", "Marital_Status"] if c in feature_cols]
    for col in categorical_cols:
        df[col] = df[col].fillna("Unknown")
    df = df[~df[categorical_cols].isin(["Unknown"]).any(axis=1)].reset_index(drop=True)

    # Fill missing numerical values with the median
    for col in ["Enlistment_Year", "Year_of_Birth"]:
        if col in feature_cols:
            df[col] = df[col].fillna(df[col].median())
            df[col] = df[col].astype(int)

    # Drop any remaining rows that still have NaN (shouldn't happen, but safety net)
    df = df.dropna(subset=feature_cols).reset_index(drop=True)

    return df, feature_cols


_RANK_ORDER = [
    "Private", "Corporal", "Sergeant", "Lieutenant", "Captain",
    "Major", "Colonel", "General", "Cadet",
]

_NOMINAL_COLS = ["Place_of_Birth", "Occupation", "Marital_Status"]


def encode_features(df, feature_cols):
    """
    One-hot encode nominal categorical features; ordinal-encode Rank.
    Numerical features (Enlistment_Year, Year_of_Birth) pass through unchanged.
    Returns X (DataFrame), y, and the list of encoded column names.
    """
    parts = []

    for col in feature_cols:
        if col == "Rank":
            rank_map = {r: i for i, r in enumerate(_RANK_ORDER)}
            df["Rank_ordinal"] = df["Rank"].map(rank_map).fillna(len(_RANK_ORDER))
            parts.append(df[["Rank_ordinal"]])
        elif col in _NOMINAL_COLS:
            one_hot = pd.get_dummies(df[col], prefix=col, dtype=int)
            parts.append(one_hot)
        else:
            parts.append(df[[col]])

    X_df = pd.concat(parts, axis=1)
    y = df["court_martialled"].values
    encoded_cols = list(X_df.columns)

    return X_df.values, y, encoded_cols


# --------------------------------------------------------------------------------------------
# 3. Training the Decision Tree Classifier with class balancing to handle imbalanced data
# --------------------------------------------------------------------------------------------

def train_model(X_train, y_train, n_features=7):
    """Train a DecisionTreeClassifier with balanced class weights.
    max_depth scales with the number of selected features to give
    the tree enough room when more features are available while
    keeping it compact for fewer features.
    """
    if n_features <= 2:
        depth = 4
    elif n_features <= 4:
        depth = 5
    elif n_features <= 5:
        depth = 6
    else:
        depth = 7

    model = DecisionTreeClassifier(
        max_depth=depth,
        min_samples_leaf=200,
        class_weight="balanced",
        random_state=42,
    )
    model.fit(X_train, y_train)
    return model


# ---------------------------------------------------------------------------
# 4. Evaluating the model on precision, recall and accuracy
# ---------------------------------------------------------------------------

def evaluate_model(model, X_test, y_test):
    """Return precision, recall, and accuracy on the test set."""
    predictions = model.predict(X_test)
    precision = precision_score(y_test, predictions, zero_division=0)
    recall = recall_score(y_test, predictions, zero_division=0)
    accuracy = accuracy_score(y_test, predictions)
    return {
        "precision": round(precision * 100),
        "recall": round(recall * 100),
        "accuracy": round(accuracy * 100),
    }


# ---------------------------------------------------------------------------
# 5. formatting the tree and findingd for frontend display 
# ---------------------------------------------------------------------------

_DISPLAY_NAMES = {
    "Place_of_Birth": "Place of Birth",
    "Marital_Status": "Marital Status",
    "Enlistment_Year": "Enlistment Year",
    "Year_of_Birth": "Birth Year",
    "Rank_ordinal": "Rank",
}


def _get_feature_label(feature_idx, threshold, feature_cols):
    """Convert a numeric split into a human-readable label.

    One-hot columns (e.g. Place_of_Birth_Brazil) become 'Place of Birth = Brazil?'
    Rank_ordinal uses the rank hierarchy so '≤ Major?' is meaningful.
    Numerical features keep '≤ 1916?'.
    """
    col_name = feature_cols[feature_idx]

    for prefix in _NOMINAL_COLS:
        if col_name.startswith(prefix + "_"):
            category = col_name[len(prefix) + 1:]
            display = _DISPLAY_NAMES.get(prefix, prefix.replace("_", " "))
            return f"{display} = {category}?"

    if col_name == "Rank_ordinal":
        code = int(np.floor(threshold))
        if code < len(_RANK_ORDER):
            rank_name = _RANK_ORDER[code]
        else:
            rank_name = _RANK_ORDER[-1]
        return f"Rank ≤ {rank_name}?"

    display = _DISPLAY_NAMES.get(col_name, col_name.replace("_", " "))
    return f"{display} ≤ {int(threshold)}?"


def _build_tree_lines(model, feature_cols, X, y):
    """
    Walk the trained tree and produce the text lines the frontend expects.
    Uses box-drawing characters for the tree structure.

    Uses decision_path with real data (X, y) for accurate rates instead of
    tree.value which is skewed by class_weight='balanced'. Also swaps yes/no
    branches for one-hot encoded features to match the visual tree.
    """
    tree = model.tree_
    node_indicator = model.decision_path(X)
    lines = []

    def _rate_str(node):
        mask = node_indicator[:, node].toarray().ravel().astype(bool)
        total = int(mask.sum())
        cm = int(y[mask].sum())
        rate = (cm / total * 100) if total > 0 else 0
        return f"{rate:.1f}%"

    def _recurse(node, prefix, is_last, branch_label):
        is_leaf = tree.children_left[node] == -1

        if branch_label is None:
            question = _get_feature_label(
                tree.feature[node], tree.threshold[node], feature_cols
            )
            lines.append(question)
            child_prefix = ""
        else:
            connector = "└── " if is_last else "├── "
            lines.append(f"{prefix}{connector}{branch_label}: Court martial rate = {_rate_str(node)}")
            child_prefix = prefix + ("    " if is_last else "│   ")

        if not is_leaf:
            col_name = feature_cols[tree.feature[node]]
            is_one_hot = any(col_name.startswith(p + "_") for p in _NOMINAL_COLS)

            if is_one_hot:
                yes_child = tree.children_right[node]
                no_child = tree.children_left[node]
            else:
                yes_child = tree.children_left[node]
                no_child = tree.children_right[node]

            if branch_label is not None:
                question = _get_feature_label(
                    tree.feature[node], tree.threshold[node], feature_cols
                )
                lines.append(f"{child_prefix}├── {question}")
                inner_prefix = child_prefix + "│   "
                _recurse(yes_child, inner_prefix, False, "Yes")
                _recurse(no_child, inner_prefix, True, "No")
            else:
                _recurse(yes_child, child_prefix, False, "Yes")
                _recurse(no_child, child_prefix, True, "No")

    _recurse(0, "", False, None)
    return lines


def _build_tree_structure(model, feature_cols, X, y):
    """Return the decision tree as a nested dict for graphical rendering.

    Uses decision_path to compute actual (unweighted) sample counts and
    court martial rates, since class_weight='balanced' distorts tree.value.
    Leaf nodes get a human-readable label comparing their rate to the
    overall baseline (e.g. "1.5× more likely than average").
    """
    tree = model.tree_
    node_indicator = model.decision_path(X)
    baseline = np.mean(y) * 100  # overall court martial %

    def _leaf_label(rate):
        if baseline == 0:
            return "No baseline"
        if rate == 0:
            return "No court martials in this group"
        ratio = rate / baseline
        if ratio >= 1.3:
            return f"{ratio:.1f}× more likely than average"
        if ratio <= 0.7:
            inverse = 1 / ratio
            return f"{inverse:.1f}× less likely than average"
        return "Similar to average"

    def _recurse(node):
        mask = node_indicator[:, node].toarray().ravel().astype(bool)
        actual_total = int(mask.sum())
        actual_cm = int(y[mask].sum())
        rate = round((actual_cm / actual_total * 100) if actual_total > 0 else 0, 1)
        is_leaf = tree.children_left[node] == -1

        result = {"rate": rate, "samples": actual_total}

        if is_leaf:
            result["label"] = _leaf_label(rate)
            result["ratio"] = round(rate / baseline, 2) if baseline > 0 else 0
        else:
            col_name = feature_cols[tree.feature[node]]
            is_one_hot = any(col_name.startswith(p + "_") for p in _NOMINAL_COLS)

            result["question"] = _get_feature_label(
                tree.feature[node], tree.threshold[node], feature_cols
            )

            if is_one_hot:
                result["yes"] = _recurse(tree.children_right[node])
                result["no"] = _recurse(tree.children_left[node])
            else:
                result["yes"] = _recurse(tree.children_left[node])
                result["no"] = _recurse(tree.children_right[node])

        return result

    return _recurse(0), round(baseline, 2)


def _generate_findings(model, feature_cols, X, y, original_df, orig_feature_cols):
    """Generate detailed, human-readable findings from the trained decision tree."""
    findings = []
    importances = model.feature_importances_
    cm_rate = np.mean(y) * 100
    cm_count = int(np.sum(y))
    total = len(y)

    findings.append(
        f"The model was trained on {total:,} soldiers, of whom {cm_count:,} "
        f"({cm_rate:.1f}%) were court-martialled. This severe class imbalance "
        f"means the model must work hard to distinguish the small minority of "
        f"court-martialled soldiers from the vast majority who were not."
    )

    group_importances = {}
    for i, col in enumerate(feature_cols):
        matched = False
        for prefix in _NOMINAL_COLS:
            if col.startswith(prefix + "_"):
                display = _DISPLAY_NAMES.get(prefix, prefix.replace("_", " "))
                group_importances[display] = group_importances.get(display, 0) + importances[i]
                matched = True
                break
        if not matched:
            display = _DISPLAY_NAMES.get(col, col.replace("_", " "))
            group_importances[display] = group_importances.get(display, 0) + importances[i]

    ranked = sorted(group_importances.items(), key=lambda x: -x[1])
    active = [(name, imp) for name, imp in ranked if imp > 0.005]
    if active:
        parts = [f"{name} ({imp:.1%})" for name, imp in active]
        findings.append(
            f"Feature importance ranking: {', '.join(parts)}. "
            f"These percentages indicate how much each feature contributes to "
            f"the model's splitting decisions. Higher means the feature is "
            f"more useful for separating court-martialled from non-court-martialled soldiers."
        )

    cat_cols_in_original = [c for c in orig_feature_cols if c in _NOMINAL_COLS or c == "Rank"]
    for col in cat_cols_in_original:
        display = _DISPLAY_NAMES.get(col, col.replace("_", " "))
        cat_rates = []
        for val in original_df[col].unique():
            if val == "Unknown":
                continue
            mask = original_df[col] == val
            n = int(mask.sum())
            if n >= 20:
                rate = np.mean(y[mask]) * 100
                cat_rates.append((val, rate, n))
        if cat_rates:
            cat_rates.sort(key=lambda x: -x[1])
            highest = cat_rates[0]
            lowest = cat_rates[-1]
            if highest[1] > cm_rate * 1.3 or lowest[1] < cm_rate * 0.7:
                findings.append(
                    f"Breaking down by {display}: {highest[0]} had the highest "
                    f"court martial rate at {highest[1]:.1f}% "
                    f"({int(highest[1] / 100 * highest[2]):,} of {highest[2]:,}), "
                    f"while {lowest[0]} had the lowest at {lowest[1]:.1f}% "
                    f"({int(lowest[1] / 100 * lowest[2]):,} of {lowest[2]:,})."
                )

    for col in orig_feature_cols:
        if col in _NOMINAL_COLS or col == "Rank":
            continue
        display = _DISPLAY_NAMES.get(col, col.replace("_", " "))
        vals = original_df[col].values
        median_val = int(np.median(vals))
        mask_low = vals <= median_val
        mask_high = vals > median_val
        n_low, n_high = int(mask_low.sum()), int(mask_high.sum())
        if n_low >= 20 and n_high >= 20:
            rate_low = np.mean(y[mask_low]) * 100
            rate_high = np.mean(y[mask_high]) * 100
            if abs(rate_low - rate_high) > 0.3:
                higher_group = f"≤ {median_val}" if rate_low > rate_high else f"> {median_val}"
                lower_group = f"> {median_val}" if rate_low > rate_high else f"≤ {median_val}"
                higher_rate = max(rate_low, rate_high)
                lower_rate = min(rate_low, rate_high)
                findings.append(
                    f"For {display}: soldiers with values {higher_group} had a "
                    f"court martial rate of {higher_rate:.1f}%, compared to "
                    f"{lower_rate:.1f}% for those with values {lower_group}."
                )

    findings.append(
        f"The model uses balanced class weighting to counteract the "
        f"{100 - cm_rate:.0f}% majority class. This boosts recall (the ability "
        f"to catch court-martialled soldiers) at the cost of precision, meaning "
        f"more non-court-martialled soldiers get incorrectly flagged. This is a "
        f"deliberate trade-off so the model does not simply predict 'not "
        f"court-martialled' for everyone."
    )

    return findings


# -------------------------------------------------------------------------------
# 6. Main function to run the full pipeline and return results for the frontend
# -------------------------------------------------------------------------------

def run_decision_tree(selected_features=None):
    """
    Full pipeline: load data -> prepare -> encode -> split -> train -> evaluate -> extract tree.
    selected_features: optional list of frontend feature names (e.g. ["Rank", "Birthplace"]).
    Returns a dictionary matching what the frontend expects.
    """
    feature_cols = _resolve_features(selected_features)

    enlistment_df, court_martialled_df = load_data()

    df, feature_cols = prepare_dataset(enlistment_df, court_martialled_df, feature_cols)

    original_df = df.copy()

    X, y, encoded_cols = encode_features(df, feature_cols)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = train_model(X_train, y_train, n_features=len(feature_cols))

    metrics = evaluate_model(model, X_test, y_test)

    tree_lines = _build_tree_lines(model, encoded_cols, X, y)

    tree_structure, baseline_rate = _build_tree_structure(model, encoded_cols, X, y)

    findings = _generate_findings(model, encoded_cols, X, y, original_df, feature_cols)

    return {
        "tree_lines": tree_lines,
        "tree_structure": tree_structure,
        "baseline_rate": baseline_rate,
        "findings": findings,
        "encoding_guide": None,
        "metrics": metrics,
        "model_info": {
            "train_size": len(X_train),
            "test_size": len(X_test),
            "max_depth": model.get_params()["max_depth"],
            "min_samples_leaf": model.get_params()["min_samples_leaf"],
            "class_weight": "balanced",
            "features": [c.replace("_", " ") for c in feature_cols],
        },
    }


if __name__ == "__main__":
    import json
    import shutil
    import argparse

    parser = argparse.ArgumentParser(
        description="Run decision tree on WWI court martial data"
    )
    parser.add_argument("--features", type=str, default=None,
        help="Comma-separated feature list, e.g. 'Rank,Birthplace,Enlistment Year'")
    args = parser.parse_args()

    feat_list = None
    if args.features:
        feat_list = [f.strip() for f in args.features.split(",")]

    result = run_decision_tree(selected_features=feat_list)

    out_path = os.path.join(os.path.dirname(__file__), 'results.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    print(f"Results saved to {out_path}")

    fe_data = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend', 'data')
    os.makedirs(fe_data, exist_ok=True)
    fe_copy = os.path.join(fe_data, 'decision_tree_results.json')
    shutil.copy(out_path, fe_copy)
    print(f"Copied to {fe_copy}")
