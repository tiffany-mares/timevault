# this is a ML-driven PATTERN DISCOVERY tool, not a prediction model (as it formerly was)
# 1. uses Naive Bayes to learn conditional probability tables from the data,
# 2. then surfaces which ranks, units, enlistment years etc are associated with each offence 
# category and by how much (aka the lift metric)

# NOTE: offence codes (4-41, 155) mapped to semantic categories

import os
import json
import argparse
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.naive_bayes import CategoricalNB
from sklearn.preprocessing import OrdinalEncoder, LabelEncoder

np.random.seed(42)

# global debug flag - set via --debug command line arg
DEBUG = False


def log(msg=""):
    """Only prints if debug mode is on. Use this instead of print()"""
    if DEBUG:
        print(msg)


# DATA LOADING

def get_csv_file_path():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(
        current_dir, '..', '..', 'database',
        'Courts_Martial_WWI_Cleaned.csv'
    )
    return os.path.normpath(csv_path)


def get_frontend_data_path():
    """Get path to frontend data folder for JSON output"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_path = os.path.join(
        current_dir, '..', '..', '..', 'frontend', 'data',
        'pattern_analysis.json'
    )
    return os.path.normpath(frontend_path)


def load_court_martial_data(csv_path=None):
    """Note: Expands multiple offence codes (i.e. "19, 6") into separate rows.
    Returns tuple of (dataframe, raw_record_count) where raw_record_count is
    the number of unique court martial proceedings before expansion."""
    if csv_path is None:
        csv_path = get_csv_file_path()

    log(f"    Loading from: {csv_path}")

    df = pd.read_csv(csv_path, dtype=str)

    # clean up column names
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(' ', '_')
    )

    expected = ['first_name', 'middle_init', 'last_name',
                'enlistment_year', 'rank', 'regimental_number',
                'unit_type', 'offence']

    missing = [c for c in expected if c not in df.columns]

    if missing:
        raise ValueError(
            f"CSV is missing expected columns: {missing}\n"
            f"Found columns: {list(df.columns)}"
        )

    raw_count = len(df)
    log(f"    Raw CSV rows (court martial records): {raw_count:,}")

    # split multi-offence rows like "19, 6" into separate rows
    df['offence'] = df['offence'].astype(str)
    df['offence_codes'] = df['offence'].str.split(r',\s*')
    df = df.explode('offence_codes').reset_index(drop=True)

    df['offence_code'] = (
        df['offence_codes']
        .str.strip()
        .str.replace(r'\.0$', '', regex=True)
    )

    # drop empty/non-numeric codes
    df = df[df['offence_code'].str.match(r'^\d+$', na=False)].copy()
    df['offence_code'] = df['offence_code'].astype(int)

    df['enlistment_year'] = pd.to_numeric(
        df['enlistment_year'], errors='coerce'
    )
    df = df.dropna(subset=['enlistment_year']).copy()
    df['enlistment_year'] = df['enlistment_year'].astype(int)

    df = df.dropna(subset=['rank', 'unit_type']).copy()

    log(f"    After expanding multi-offence rows: {len(df):,}")

    return df, raw_count


# OFFENCE CODE MAPPING

# maps British Army Act section numbers to human readable names
OFFENCE_CODE_TO_NAME = {
    4:  'Offences in relation to the enemy (capital)',
    5:  'Offences in relation to the enemy (non-capital)',
    6:  'Active service offences',
    7:  'Mutiny and sedition',
    8:  'Striking or threatening superior officer',
    9:  'Disobedience to superior officer',
    10: 'Insubordination',
    11: 'Neglect to obey garrison or other orders',
    12: 'Desertion',
    13: 'Fraudulent enlistment',
    14: 'Assistance of or connivance at desertion',
    15: 'Absence from duty without leave',
    16: 'Scandalous conduct of an officer',
    17: 'Fraud by persons in charge of money or goods',
    18: 'Disgraceful conduct of a soldier',
    19: 'Drunkenness',
    20: 'Permitting escape of person in custody',
    21: 'Irregular arrest or confinement',
    22: 'Escape from confinement',
    23: 'Corrupt dealings in respect of supplies',
    24: 'Deficiency in and injury to equipment',
    25: 'Falsifying official documents and false declarations',
    26: 'Neglect to report and signing in blank',
    27: 'False accusation or false statement by soldier',
    28: 'Offences in relation to courts-martial',
    29: 'Contempt of court martial',
    30: 'Billeting offences',
    31: 'Impressment offences',
    32: 'Enlistment offences (general)',
    33: 'Enlistment offences (false oath)',
    34: 'Enlistment offences (false answers)',
    35: 'Traitorous or disloyal words',
    36: 'Injurious disclosures',
    37: 'Ill-treating soldiers',
    38: 'Duelling and attempting to commit suicide',
    39: 'Refusal to deliver to civil power',
    40: 'Conduct prejudicial to good order and military discipline',
    41: 'Civil offences (by reference to ordinary law)',
    155: 'Trafficking in commissions',
}

# group individual offences into broader categories for analysis
OFFENCE_GROUP_MAP = {
    # combat/enemy related
    'Offences in relation to the enemy (capital)':      'Combat/Enemy',
    'Offences in relation to the enemy (non-capital)':  'Combat/Enemy',
    'Active service offences':                          'Combat/Enemy',

    # insubordination
    'Mutiny and sedition':                              'Insubordination',
    'Striking or threatening superior officer':          'Insubordination',
    'Disobedience to superior officer':                 'Insubordination',
    'Insubordination':                                  'Insubordination',

    # absence/desertion
    'Desertion':                                        'Absence/Desertion',
    'Absence from duty without leave':                  'Absence/Desertion',
    'Escape from confinement':                          'Absence/Desertion',
    'Assistance of or connivance at desertion':         'Absence/Desertion',

    # drunkenness is its own thing - big enough category
    'Drunkenness':                                      'Drunkenness',

    # general misconduct
    'Conduct prejudicial to good order and military discipline': 'Misconduct',
    'Disgraceful conduct of a soldier':                 'Misconduct',
    'Scandalous conduct of an officer':                 'Misconduct',
    'Ill-treating soldiers':                            'Misconduct',

    # fraud/theft/property
    'Fraud by persons in charge of money or goods':     'Fraud/Theft/Property',
    'Corrupt dealings in respect of supplies':          'Fraud/Theft/Property',
    'Deficiency in and injury to equipment':            'Fraud/Theft/Property',

    # neglect
    'Neglect to obey garrison or other orders':         'Neglect/Orders',
    'Neglect to report and signing in blank':           'Neglect/Orders',

    # custody stuff
    'Permitting escape of person in custody':           'Custody Offences',
    'Irregular arrest or confinement':                  'Custody Offences',

    # everything else just goes here
    'Fraudulent enlistment':                            'Other',
    'Falsifying official documents and false declarations': 'Other',
    'False accusation or false statement by soldier':   'Other',
    'Offences in relation to courts-martial':           'Other',
    'Contempt of court martial':                        'Other',
    'Billeting offences':                               'Other',
    'Impressment offences':                             'Other',
    'Enlistment offences (general)':                    'Other',
    'Enlistment offences (false oath)':                 'Other',
    'Enlistment offences (false answers)':              'Other',
    'Traitorous or disloyal words':                     'Other',
    'Injurious disclosures':                            'Other',
    'Duelling and attempting to commit suicide':         'Other',
    'Refusal to deliver to civil power':                'Other',
    'Civil offences (by reference to ordinary law)':    'Other',
    'Trafficking in commissions':                       'Other',
}


def map_offence_codes(df):
    """Map numeric codes -> readable names -> grouped categories"""

    df['offence_name'] = df['offence_code'].map(OFFENCE_CODE_TO_NAME)

    unmapped = df['offence_name'].isna()
    if unmapped.any():
        bad_codes = df.loc[unmapped, 'offence_code'].unique()
        log(f"    WARNING: {unmapped.sum()} rows with unrecognised "
              f"offence codes: {sorted(bad_codes)}")
        df = df[~unmapped].copy()

    df['offence_grouped'] = df['offence_name'].map(OFFENCE_GROUP_MAP)

    # anything that didn't get mapped just goes to Other
    still_unmapped = df['offence_grouped'].isna()
    if still_unmapped.any():
        df.loc[still_unmapped, 'offence_grouped'] = 'Other'

    return df


# MODEL FITTING

def prepare_and_fit(df, feature_cols_override=None):
    """Encode features and fit the NB model on ALL data.
    No train/test split - we're doing pattern discovery, not prediction.
    Using the full dataset gives the most stable probability estimates,
    especially for small classes like Custody (163 records)"""

    feature_cols = feature_cols_override or ['rank', 'unit_type', 'enlistment_year']
    target_col = 'offence_grouped'

    # need enlistment_year as string for the categorical encoder
    df['enlistment_year'] = df['enlistment_year'].astype(str)

    feature_encoder = OrdinalEncoder(
        handle_unknown='use_encoded_value',
        unknown_value=-1
    )
    X = feature_encoder.fit_transform(df[feature_cols])

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df[target_col])

    # fit on everything - real priors so lift values reflect the actual rates 
    # in the data, not artificial uniform weights
    model = CategoricalNB(alpha=1.0)
    model.fit(X, y)

    return model, feature_encoder, label_encoder, feature_cols


# PATTERN ANALYSIS

# pull out what the model actually learned and turn it into something humans can read
def extract_learned_probabilities(model, feature_encoder, label_encoder,
                                  feature_cols):
    """Pull conditional probability tables from the trained model
    and map encoded indices back to readable labels.

    Returns a nested dict:
      {offence_class: {feature: [ {value, probability, rate_vs_baseline}, ... ]}}

    probability = P(feature_value | offence_class)
    rate_vs_baseline (lift) = P(value|class) / P(value)
    """

    class_names = label_encoder.classes_
    class_priors = np.exp(model.class_log_prior_)
    feature_log_probs = model.feature_log_prob_
    encoder_categories = feature_encoder.categories_

    patterns = {}

    for class_idx, class_name in enumerate(class_names):
        patterns[class_name] = {}

        for feat_idx, feat_name in enumerate(feature_cols):
            log_probs = feature_log_probs[feat_idx]
            probs = np.exp(log_probs)

            class_probs = probs[class_idx]
            marginal_probs = probs.T @ class_priors

            cat_labels = encoder_categories[feat_idx]

            value_records = []

            for cat_idx in range(len(cat_labels)):
                p = class_probs[cat_idx]
                m = marginal_probs[cat_idx]
                lift = (p / m) if m > 0 else 0.0

                value_records.append({
                    "value": str(cat_labels[cat_idx]),
                    "probability": round(float(p), 4),
                    "rate_vs_baseline": round(float(lift), 2),
                })

            # sort by probability descending
            value_records.sort(
                key=lambda r: r["probability"], reverse=True
            )

            patterns[class_name][feat_name] = value_records

    return patterns


def identify_notable_patterns(patterns, min_lift=1.3, min_prob=0.03,
                               top_n=5):
    """Filter the full probability tables down to the most interesting
    findings (stuff with lift well above or below 1.0)
    """

    summary = {}

    for class_name, features in patterns.items():
        summary[class_name] = {}

        for feat_name, records in features.items():
            top_values = records[:top_n]

            # overrepresented = lift >= threshold
            overrepresented_records = []
            for record in records:
                lift_value = record["rate_vs_baseline"]
                probability = record["probability"]

                if lift_value >= min_lift and probability >= min_prob:
                    overrepresented_records.append(record)

            # highest lift first
            over = sorted(
                overrepresented_records,
                key=lambda record: record["rate_vs_baseline"],
                reverse=True
            )

            # underrepresented = lift <= 1/threshold
            under_threshold = 1.0 / min_lift

            underrepresented_records = []
            for record in records:
                lift_value = record["rate_vs_baseline"]
                probability = record["probability"]

                if lift_value <= under_threshold and probability >= min_prob:
                    underrepresented_records.append(record)

            # lowest lift first
            under = sorted(
                underrepresented_records,
                key=lambda record: record["rate_vs_baseline"]
            )

            summary[class_name][feat_name] = {
                "top_values": top_values,
                "overrepresented": over[:top_n],
                "underrepresented": under[:top_n],
                "significant": len(over) > 0,
            }

    return summary


def print_pattern_analysis(patterns, summary, class_priors, label_encoder):
    """Console output of the pattern analysis.
    Shows distributions, overrepresented/underrepresented values"""
    class_names = label_encoder.classes_

    log("\n--- PATTERNS DISCOVERED ---")
    log("Probability = P(feature value | offence class)")
    log("Lift = how much more/less likely vs overall population (1.0 = average)\n")

    for class_idx, class_name in enumerate(class_names):
        prior = class_priors[class_idx]
        log(f"[{class_name}] ({prior:.1%} of records)")

        for feat_name, feat_summary in summary[class_name].items():
            sig = " ***" if feat_summary["significant"] else ""
            top = [f"{r['value']} ({r['probability']:.0%})" for r in feat_summary["top_values"] if r['probability'] >= 0.01]
            log(f"  {feat_name}:{sig}  {', '.join(top)}")

            for r in feat_summary["overrepresented"]:
                log(f"    + {r['value']}  {r['rate_vs_baseline']:.1f}x (P={r['probability']:.0%})")
            for r in feat_summary["underrepresented"]:
                log(f"    - {r['value']}  {r['rate_vs_baseline']:.1f}x (P={r['probability']:.0%})")
            if not feat_summary["significant"]:
                log(f"    (nothing notable)")
        log("")


def export_patterns_json(patterns, summary, class_priors,
                          label_encoder, total_records,
                          output_path="pattern_analysis.json"):
    """Dump everything to JSON so the frontend can render it however it wants"""

    class_names = label_encoder.classes_

    export = {
        "model": "CategoricalNB",
        "mode": "pattern_discovery",
        "total_records": total_records,
        "description": (
            "Conditional probability tables learned from 11k+ court "
            "martial records using Naive Bayes. "
            "'probability' = P(feature_value | offence_class). "
            "'rate_vs_baseline' (lift) = P(value|class) / P(value). "
            "Trained on full dataset (no train/test split) for maximum "
            "stability of probability estimates."
        ),
        "classes": {},
    }

    for class_idx, class_name in enumerate(class_names):
        export["classes"][class_name] = {
            "prior": round(float(class_priors[class_idx]), 4),
            "features": {},
        }

        for feat_name in summary[class_name]:
            fd = summary[class_name][feat_name]
            export["classes"][class_name]["features"][feat_name] = {
                "significant": fd["significant"],
                "top_values": fd["top_values"],
                "overrepresented": fd["overrepresented"],
                "underrepresented": fd["underrepresented"],
                "full_distribution": patterns[class_name][feat_name],
            }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export, f, indent=2, ensure_ascii=False)

    return output_path


# VISUALIZATIONS

def plot_offence_distribution(df, output_path='offence_distribution.png'):
    """Show offence distribution as proportions with raw counts for context"""

    plt.figure(figsize=(12, 7))

    counts = df['offence_grouped'].value_counts()
    total = len(df)
    proportions = counts / total

    colors = plt.cm.Blues(np.linspace(0.3, 0.9, len(proportions)))

    bars = plt.barh(proportions.index, proportions.values, color=colors)
    for bar, (offence, prop) in zip(bars, proportions.items()):
        raw = counts[offence]
        plt.text(prop + 0.003, bar.get_y() + bar.get_height() / 2,
                 f'{prop:.1%}  (n={raw:,})',
                 va='center', fontsize=10)

    plt.xlabel('Proportion of All Records', fontsize=12)
    plt.ylabel('Offence Type', fontsize=12)
    plt.title('Distribution of Offence Types (Grouped)\n'
              'Each bar shows the rate relative to all records',
              fontsize=14, fontweight='bold')
    plt.xlim(0, proportions.max() * 1.25)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()

    return output_path


def plot_top_lifts(summary, class_names,
                    output_path="top_pattern_lifts.png"):
    """Bar chart of highest lift values across all offence types.
    This is the "here's what the model found" summary chart"""

    rows = []
    for cls in class_names:
        for feat, fd in summary[cls].items():
            for r in fd["overrepresented"]:
                rows.append({
                    "offence": cls,
                    "feature": feat,
                    "value": r["value"],
                    "lift": r["rate_vs_baseline"],
                    "label": f"{cls}\n← {feat}: {r['value']}",
                })

    if not rows:
        log("    (no overrepresented patterns to plot)")
        return None

    lift_df = (pd.DataFrame(rows)
               .sort_values("lift", ascending=False)
               .head(25))

    fig, ax = plt.subplots(
        figsize=(12, max(6, len(lift_df) * 0.45))
    )
    colors = plt.cm.RdYlGn(
        np.linspace(0.15, 0.85, len(lift_df))
    )[::-1]

    bars = ax.barh(
        range(len(lift_df)), lift_df["lift"].values,
        color=colors, edgecolor="white", linewidth=0.5,
    )

    ax.set_yticks(range(len(lift_df)))
    ax.set_yticklabels(lift_df["label"].values, fontsize=8)
    ax.invert_yaxis()
    ax.axvline(x=1.0, color="grey", linestyle="--", linewidth=1,
               label="Baseline (1.0x)")

    for bar, v in zip(bars, lift_df["lift"].values):
        ax.text(v + 0.05, bar.get_y() + bar.get_height() / 2,
                f"{v:.1f}x", va="center", fontsize=9,
                fontweight="bold")

    ax.set_xlabel("Lift vs Baseline (x)", fontsize=11)
    ax.set_title(
        "Strongest Patterns Discovered\n"
        "(feature values most overrepresented in each offence class)",
        fontsize=13, fontweight="bold", pad=15,
    )

    ax.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight",
                facecolor="white", edgecolor="none")
    plt.close()

    return output_path


def plot_class_feature_heatmap(patterns, class_names, feature_name,
                                feature_encoder, feature_cols,
                                output_path=None):
    """Heatmap of P(feature_value | class)
    Each row sums to 1 regardless of class size (already per-capita)"""

    feat_idx = feature_cols.index(feature_name)
    cat_labels = [str(c) for c in feature_encoder.categories_[feat_idx]]

    matrix = np.zeros((len(class_names), len(cat_labels)))
    for i, cls in enumerate(class_names):
        for rec in patterns[cls][feature_name]:
            j = cat_labels.index(rec["value"])
            matrix[i, j] = rec["probability"]

    # only show columns where at least one class has >= 2% probability
    col_mask = matrix.max(axis=0) >= 0.02
    matrix = matrix[:, col_mask]
    shown = [l for l, m in zip(cat_labels, col_mask) if m]

    if output_path is None:
        output_path = f"heatmap_{feature_name}.png"

    fig, ax = plt.subplots(
        figsize=(max(10, len(shown) * 0.7), 8)
    )

    sns.heatmap(
        matrix, annot=True, fmt=".0%", cmap="YlOrRd",
        xticklabels=shown, yticklabels=class_names,
        linewidths=0.5, linecolor="white",
        cbar_kws={"label": "P(value | class)"}, ax=ax,
    )
    ax.set_xlabel(feature_name, fontsize=12, fontweight="bold")
    ax.set_ylabel("Offence Class", fontsize=12, fontweight="bold")
    ax.set_title(
        f"Conditional Probabilities: {feature_name}\n"
        f"P({feature_name} = value | offence class) - "
        f"each row normalized independently",
        fontsize=13, fontweight="bold", pad=15,
    )

    plt.xticks(rotation=45, ha="right", fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight",
                facecolor="white", edgecolor="none")
    plt.close()

    return output_path


def plot_per_capita_feature_rates(df, feature_col,
                                   output_path=None, top_n=10):
    """Stacked bar chart: within each feature value, what % goes to each offence.
    Fully per-capita"""

    if output_path is None:
        output_path = f"per_capita_{feature_col}.png"

    # keep only feature values with enough data to be meaningful
    val_counts = df[feature_col].value_counts()
    keep_vals = val_counts[val_counts >= 20].index.tolist()

    # if too many values, keep the top_n by frequency
    if len(keep_vals) > top_n:
        keep_vals = val_counts.head(top_n).index.tolist()

    sub = df[df[feature_col].isin(keep_vals)].copy()

    # for each feature value, what proportion falls into each offence
    ct = pd.crosstab(sub[feature_col], sub['offence_grouped'],
                     normalize='index')

    ct = ct.reindex(index=keep_vals)

    fig, ax = plt.subplots(figsize=(14, max(6, len(keep_vals) * 0.6)))
    ct.plot.barh(stacked=True, ax=ax, colormap='tab20', width=0.8)

    ax.set_xlabel('Proportion of Records', fontsize=12)
    ax.set_ylabel(feature_col, fontsize=12)
    ax.set_title(
        f'Offence Breakdown by {feature_col}\n'
        f'Within each {feature_col}, what share goes to each offence type?',
        fontsize=13, fontweight='bold', pad=15
    )
    ax.legend(title='Offence Type', bbox_to_anchor=(1.02, 1),
              loc='upper left', fontsize=8)
    ax.set_xlim(0, 1)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()

    return output_path


# API ENTRY POINT

def run(selected_features=None):
    """Entry point called from Flask. Runs pattern analysis and returns
    a dict matching what the frontend expects (same shape as pattern_analysis.json).
    selected_features: optional list like ["Rank", "Unit Type", "Enlistment Year"].
    If None, all three features are used."""

    FEATURE_NAME_MAP = {
        "Rank": "rank",
        "Unit Type": "unit_type",
        "Enlistment Year": "enlistment_year",
    }

    if selected_features:
        feature_cols_override = [
            FEATURE_NAME_MAP[f] for f in selected_features
            if f in FEATURE_NAME_MAP
        ]
        if not feature_cols_override:
            feature_cols_override = None
    else:
        feature_cols_override = None

    df, raw_record_count = load_court_martial_data()
    df = map_offence_codes(df)

    model, feature_encoder, label_encoder, feature_cols = prepare_and_fit(df, feature_cols_override)

    patterns = extract_learned_probabilities(
        model, feature_encoder, label_encoder, feature_cols
    )
    summary = identify_notable_patterns(
        patterns, min_lift=1.3, min_prob=0.03, top_n=5
    )

    class_names = label_encoder.classes_
    class_priors = np.exp(model.class_log_prior_)
    offence_counts = df['offence_grouped'].value_counts()

    export = {
        "model": "CategoricalNB",
        "mode": "pattern_discovery",
        "total_records": int(raw_record_count),
        "features_used": feature_cols,
        "classes": {},
    }

    for class_idx, class_name in enumerate(class_names):
        export["classes"][class_name] = {
            "prior": round(float(class_priors[class_idx]), 4),
            "count": int(offence_counts.get(class_name, 0)),
            "features": {},
        }
        for feat_name in feature_cols:
            if class_name in summary and feat_name in summary[class_name]:
                fd = summary[class_name][feat_name]
                export["classes"][class_name]["features"][feat_name] = {
                    "significant": fd["significant"],
                    "top_values": fd["top_values"],
                    "overrepresented": fd["overrepresented"],
                    "underrepresented": fd["underrepresented"],
                    "full_distribution": patterns[class_name][feat_name],
                }

    return export


# MAIN

def main(debug=None):
    """Run the full pattern analysis pipeline.
    Pass debug=True to enable console output, or use --debug from CLI"""

    # allow override of the debug flag
    global DEBUG
    if debug is not None:
        DEBUG = debug

    log("=" * 70)
    log("PATTERN ANALYSIS: WWI COURT MARTIAL OFFENCE TYPES")
    log("  Data source: Courts_Martial_WWI_Cleaned.csv")
    log("  Mode: pattern discovery (not prediction)")
    log("=" * 70)

    # load data
    log("\n[1] Loading data from CSV...")
    df, raw_record_count = load_court_martial_data()

    # map codes to categories
    log("\n[2] Mapping offence codes to categories...")
    df = map_offence_codes(df)

    n_classes = df['offence_grouped'].nunique()
    n_codes = df['offence_code'].nunique()
    log(f"    Unique offence codes found: {n_codes}")
    log(f"    Grouped into: {n_classes} semantic categories")

    # distribution
    log("\n[3] Offence distribution:")
    total = len(df)
    for offence, count in df['offence_grouped'].value_counts().items():
        log(f"    {offence:<35} {count / total:>6.1%} "
              f"(n={count:,})")

    # fit model on ALL data,  no train/test split needed since
    # we're extracting probability tables, not evaluating predictions
    log(f"\n[4] Fitting model on full dataset...")
    model, feature_encoder, label_encoder, feature_cols = \
        prepare_and_fit(df)

    log(f"    Features: {feature_cols}")
    log(f"    Total records: {total:,}")
    log(f"    Offence classes: {n_classes}")

    # extract patterns from the learned probability tables
    log("\n[5] Extracting learned probability patterns...")

    patterns = extract_learned_probabilities(
        model, feature_encoder, label_encoder, feature_cols
    )

    summary = identify_notable_patterns(
        patterns, min_lift=1.3, min_prob=0.03, top_n=5
    )

    class_priors = np.exp(model.class_log_prior_)

    print_pattern_analysis(
        patterns, summary, class_priors, label_encoder
    )

    # export for the frontend - save to both backend and frontend locations
    # use raw_record_count (actual court martial proceedings) not expanded count
    json_path = export_patterns_json(
        patterns, summary, class_priors, label_encoder, raw_record_count
    )
    log(f"\n    Exported pattern data: {json_path}")

    # also save directly to frontend data folder
    frontend_json_path = get_frontend_data_path()
    export_patterns_json(
        patterns, summary, class_priors, label_encoder, raw_record_count,
        output_path=frontend_json_path
    )
    log(f"    Exported to frontend: {frontend_json_path}")

    # visualizations
    log("\n[6] Generating visualizations...")

    class_names = label_encoder.classes_

    dist_path = plot_offence_distribution(df)
    log(f"    Saved: {dist_path}")

    lift_path = plot_top_lifts(summary, class_names)
    if lift_path:
        log(f"    Saved: {lift_path}")

    # heatmaps for each feature
    for feat in feature_cols:
        hm_path = plot_class_feature_heatmap(
            patterns, class_names, feat,
            feature_encoder, feature_cols
        )
        log(f"    Saved: {hm_path}")

    # stacked bar charts for each feature
    for feat in feature_cols:
        pc_path = plot_per_capita_feature_rates(df, feat)
        log(f"    Saved: {pc_path}")

    log("\n" + "=" * 70)
    log("COMPLETE")
    log("=" * 70)

    return df, model, patterns, summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pattern analysis of WWI court martial records"
    )
    parser.add_argument(
        "--debug", action="store_true",
        help="enable verbose console output"
    )
    args = parser.parse_args()
    DEBUG = args.debug

    df, model, patterns, summary = main()