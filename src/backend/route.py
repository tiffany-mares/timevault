# This file will be for connecting the backend database operations to the frontend. 
import os
import sys
import json
import importlib.util
import time
from flask import Flask, request, jsonify, g
from flask_cors import CORS

script_dir = os.path.dirname(os.path.realpath(__file__))
subdirectory_path = os.path.join(script_dir, 'database')
subdirectory_second_path = os.path.join(script_dir, 'signin')
dt_script_path = os.path.join(script_dir, 'machine-learning', 'decision-tree', 'decision-tree.py')
lr_script_path = os.path.join(script_dir, 'machine-learning', 'logistic-regression', 'logistic_regression.py')
nb_script_path = os.path.join(script_dir, 'machine-learning', 'naive-bayes', 'naive_bayes.py')
sys.path.append(subdirectory_path)
sys.path.append(subdirectory_second_path)

from database.compare_page_database import (
    single_compare_list, single_compare_year,
    single_compare_place_of_birth, single_compare_marital_status,
    double_compare, double_compare_single_year, double_compare_both_years,
    double_compare_birthplace, double_compare_birthplace_and_year,
    double_compare_marital, double_compare_marital_and_year,
    double_compare_birthplace_and_marital
)
from signin import auth_bp, decode_token
from database.offence_trends_page_database import get_common_offences, get_offence_distribution, get_trends_over_time, get_breakdown_by_group
from helper import get_db_connection

app = Flask(__name__)
CORS(app)
app.register_blueprint(auth_bp)

COL_MAP = {
    'Rank': 'Rank',
    'Unit Type': 'Unit_Type',
    'Place of Birth': 'Place_of_Birth',
    'Occupation': 'Occupation',
    'Marital Status': 'Marital_Status',
    'Enlistment Year': 'Enlistment_Year',
    'Year of Birth': 'Year_of_Birth',
}

@app.route('/api/trends', methods=['POST'])
def offence_trends():
    data = request.json

    raw_start = data.get('yearStart', '')
    raw_end = data.get('yearEnd', '')
    year_start = int(raw_start) if raw_start else 1914
    year_end = int(raw_end) if raw_end else 1918
    ranks = data.get('ranks', [])
    units = data.get('units', [])
    offence_codes = data.get('offenceCodes', [])

    return jsonify({
        'commonOffences': get_common_offences(year_start, year_end, ranks, units, offence_codes),
        'distribution': get_offence_distribution(year_start, year_end, ranks, units, offence_codes),
        'trendsOverTime': get_trends_over_time(year_start, year_end, ranks, units, offence_codes),
        'byGroup': {
            'rank': get_breakdown_by_group(year_start, year_end, ranks, units, offence_codes, 'rank'),
            'unit': get_breakdown_by_group(year_start, year_end, ranks, units, offence_codes, 'unit'),
            'occupation': get_breakdown_by_group(year_start, year_end, ranks, units, offence_codes, 'occupation'),
            'birthplace': get_breakdown_by_group(year_start, year_end, ranks, units, offence_codes, 'birthplace'),
        }
    })

@app.route('/api/compare', methods=['POST'])
def offence_compare():
  try:
    data = request.json
    mode = data['mode']
    cat1 = data['cat1']
    
    group_a = data['groupA']
    group_b = data['groupB']

    cat2 = data.get('cat2', '')

    if mode == 'double':
        # Both years
        if cat1 in ('Enlistment Year', 'Year of Birth') and cat2 in ('Enlistment Year', 'Year of Birth'):
            result_a = double_compare_both_years(group_a['start'], group_a['end'], group_a['start2'], group_a['end2'], group_a['offences'])
            result_b = double_compare_both_years(group_b['start'], group_b['end'], group_b['start2'], group_b['end2'], group_b['offences'])
        # Birthplace + year
        elif cat1 == 'Place of Birth' and cat2 in ('Enlistment Year', 'Year of Birth'):
            result_a = double_compare_birthplace_and_year(group_a['cat1Values'], group_a['start'], group_a['end'], COL_MAP[cat2], group_a['offences'])
            result_b = double_compare_birthplace_and_year(group_b['cat1Values'], group_b['start'], group_b['end'], COL_MAP[cat2], group_b['offences'])
        elif cat2 == 'Place of Birth' and cat1 in ('Enlistment Year', 'Year of Birth'):
            result_a = double_compare_birthplace_and_year(group_a['cat2Values'], group_a['start'], group_a['end'], COL_MAP[cat1], group_a['offences'])
            result_b = double_compare_birthplace_and_year(group_b['cat2Values'], group_b['start'], group_b['end'], COL_MAP[cat1], group_b['offences'])
        # Marital + year
        elif cat1 == 'Marital Status' and cat2 in ('Enlistment Year', 'Year of Birth'):
            result_a = double_compare_marital_and_year(group_a['cat1Values'], group_a['start'], group_a['end'], COL_MAP[cat2], group_a['offences'])
            result_b = double_compare_marital_and_year(group_b['cat1Values'], group_b['start'], group_b['end'], COL_MAP[cat2], group_b['offences'])
        elif cat2 == 'Marital Status' and cat1 in ('Enlistment Year', 'Year of Birth'):
            result_a = double_compare_marital_and_year(group_a['cat2Values'], group_a['start'], group_a['end'], COL_MAP[cat1], group_a['offences'])
            result_b = double_compare_marital_and_year(group_b['cat2Values'], group_b['start'], group_b['end'], COL_MAP[cat1], group_b['offences'])
        # Birthplace + marital
        elif cat1 == 'Place of Birth' and cat2 == 'Marital Status':
            result_a = double_compare_birthplace_and_marital(group_a['cat1Values'], group_a['cat2Values'], group_a['offences'])
            result_b = double_compare_birthplace_and_marital(group_b['cat1Values'], group_b['cat2Values'], group_b['offences'])
        elif cat2 == 'Place of Birth' and cat1 == 'Marital Status':
            result_a = double_compare_birthplace_and_marital(group_a['cat2Values'], group_a['cat1Values'], group_a['offences'])
            result_b = double_compare_birthplace_and_marital(group_b['cat2Values'], group_b['cat1Values'], group_b['offences'])
        # Birthplace + other
        elif cat1 == 'Place of Birth':
            result_a = double_compare_birthplace(group_a['cat1Values'], group_a['cat2Values'], group_a['offences'], COL_MAP[cat2])
            result_b = double_compare_birthplace(group_b['cat1Values'], group_b['cat2Values'], group_b['offences'], COL_MAP[cat2])
        elif cat2 == 'Place of Birth':
            result_a = double_compare_birthplace(group_a['cat2Values'], group_a['cat1Values'], group_a['offences'], COL_MAP[cat1])
            result_b = double_compare_birthplace(group_b['cat2Values'], group_b['cat1Values'], group_b['offences'], COL_MAP[cat1])
        # Marital + other
        elif cat1 == 'Marital Status':
            result_a = double_compare_marital(group_a['cat1Values'], group_a['cat2Values'], group_a['offences'], COL_MAP[cat2])
            result_b = double_compare_marital(group_b['cat1Values'], group_b['cat2Values'], group_b['offences'], COL_MAP[cat2])
        elif cat2 == 'Marital Status':
            result_a = double_compare_marital(group_a['cat2Values'], group_a['cat1Values'], group_a['offences'], COL_MAP[cat1])
            result_b = double_compare_marital(group_b['cat2Values'], group_b['cat1Values'], group_b['offences'], COL_MAP[cat1])
        # Year + other
        elif cat1 in ('Enlistment Year', 'Year of Birth'):
            result_a = double_compare_single_year(group_a['start'], group_a['end'], COL_MAP[cat1], group_a['cat2Values'], group_a['offences'], COL_MAP[cat2])
            result_b = double_compare_single_year(group_b['start'], group_b['end'], COL_MAP[cat1], group_b['cat2Values'], group_b['offences'], COL_MAP[cat2])
        elif cat2 in ('Enlistment Year', 'Year of Birth'):
            result_a = double_compare_single_year(group_a['start'], group_a['end'], COL_MAP[cat2], group_a['cat1Values'], group_a['offences'], COL_MAP[cat1])
            result_b = double_compare_single_year(group_b['start'], group_b['end'], COL_MAP[cat2], group_b['cat1Values'], group_b['offences'], COL_MAP[cat1])
        # Everything else
        else:
            result_a = double_compare(group_a['cat1Values'], group_a['cat2Values'], group_a['offences'], COL_MAP[cat1], COL_MAP[cat2])
            result_b = double_compare(group_b['cat1Values'], group_b['cat2Values'], group_b['offences'], COL_MAP[cat1], COL_MAP[cat2])
    # Single comparisons
    else:
        # Year
        if cat1 in ('Enlistment Year', 'Year of Birth'):
            result_a = single_compare_year(group_a['start'], group_a['end'], COL_MAP[cat1], group_a['offences'])
            result_b = single_compare_year(group_b['start'], group_b['end'], COL_MAP[cat1], group_b['offences'])
        # Place of Birth
        elif cat1 == 'Place of Birth':
            result_a = single_compare_place_of_birth(group_a['cat1Values'], group_a['offences'])
            result_b = single_compare_place_of_birth(group_b['cat1Values'], group_b['offences'])
        # Marital Status
        elif cat1 == 'Marital Status':
            result_a = single_compare_marital_status(group_a['cat1Values'], group_a['offences'])
            result_b = single_compare_marital_status(group_b['cat1Values'], group_b['offences'])
        # Everything else
        elif cat1 in ('Rank', 'Unit Type', 'Occupation'):
            result_a = single_compare_list(group_a['cat1Values'], COL_MAP[cat1], group_a['offences'])
            result_b = single_compare_list(group_b['cat1Values'], COL_MAP[cat1], group_b['offences'])
        else:
            return jsonify({'error': f'Unknown category: {cat1}'}), 400

    return jsonify({'groupA': result_a, 'groupB': result_b})
  except KeyError as e:
    return jsonify({'error': f'Missing required field: {e}'}), 400
  except Exception as e:
    return jsonify({'error': str(e)}), 500

_ALLOWED_DT_FEATURES = {
    "Rank", "Birthplace", "Occupation",
    "Marital Status", "Enlistment Year", "Birth Year",
}

@app.route('/api/run-decision-tree', methods=['POST'])
def run_decision_tree_trigger():
    data = request.get_json(silent=True) or {}
    features = data.get('features', None)

    if features is not None:
        if not isinstance(features, list):
            return jsonify({'error': 'features must be a list'}), 400
        invalid = [f for f in features if f not in _ALLOWED_DT_FEATURES]
        if invalid:
            return jsonify({'error': f'Invalid features: {invalid}'}), 400
        if len(features) == 0:
            return jsonify({'error': 'At least one feature is required'}), 400

    try:
        spec = importlib.util.spec_from_file_location('decision_tree', dt_script_path)
        dt_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(dt_module)

        result = dt_module.run_decision_tree(selected_features=features)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f'{type(e).__name__}: {e}'}), 500

_ALLOWED_LR_FEATURES = {
    "Rank", "Unit Type", "Birthplace", "Occupation",
    "Marital Status", "Enlistment Year", "Birth Year",
}

@app.route('/api/run-logistic-regression', methods=['POST'])
def run_logistic_regression_trigger():
    data = request.get_json(silent=True) or {}
    features = data.get('features', None)

    if features is not None:
        if not isinstance(features, list):
            return jsonify({'error': 'features must be a list'}), 400
        invalid = [f for f in features if f not in _ALLOWED_LR_FEATURES]
        if invalid:
            return jsonify({'error': f'Invalid features: {invalid}'}), 400
        if len(features) == 0:
            return jsonify({'error': 'At least one feature is required'}), 400

    spec = importlib.util.spec_from_file_location('logistic_regression', lr_script_path)
    lr_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lr_module)

    result = lr_module.run(selected_feature_names=features)
    return jsonify(result)

_ALLOWED_NB_FEATURES = {
    "Rank", "Unit Type", "Enlistment Year",
}

@app.route('/api/run-naive-bayes', methods=['POST'])
def run_naive_bayes_trigger():
    data = request.get_json(silent=True) or {}
    features = data.get('features', None)

    if features is not None:
        if not isinstance(features, list):
            return jsonify({'error': 'features must be a list'}), 400
        invalid = [f for f in features if f not in _ALLOWED_NB_FEATURES]
        if invalid:
            return jsonify({'error': f'Invalid features: {invalid}'}), 400
        if len(features) == 0:
            return jsonify({'error': 'At least one feature is required'}), 400

    spec = importlib.util.spec_from_file_location('naive_bayes', nb_script_path)
    nb_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(nb_module)

    result = nb_module.run(selected_features=features)
    return jsonify(result)

def _get_user_from_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    payload = decode_token(auth_header[7:])
    return payload

# --- API request logging -----------------------------------------------------

@app.before_request
def _start_request_timer():
    g.request_start = time.perf_counter()


def _should_log_request():
    """Only log real API traffic; skip CORS preflight and admin self-noise."""
    if request.method in ("OPTIONS", "HEAD"):
        return False
    if not request.path.startswith("/api/"):
        return False
    if request.path.startswith("/api/admin/"):
        return False
    return True


@app.after_request
def _log_api_request(response):
    # Never log during pytest runs unless a test explicitly opts in.
    if app.config.get("TESTING") and not app.config.get("LOG_REQUESTS_IN_TESTS"):
        return response
    if not _should_log_request():
        return response
    try:
        start = getattr(g, "request_start", None)
        duration_ms = (time.perf_counter() - start) * 1000.0 if start is not None else 0.0
        payload = _get_user_from_token()
        username = payload.get("username") if payload else None
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO api_request_log (method, path, status_code, duration_ms, username) "
            "VALUES (%s, %s, %s, %s, %s)",
            (request.method, request.path, response.status_code, duration_ms, username),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        # Logging must never break or alter an API response.
        pass
    return response

def _require_admin():
    """Return (payload, None) for a valid admin token, else (None, error_response)."""
    payload = _get_user_from_token()
    if not payload:
        return None, (jsonify({'error': 'Unauthorized'}), 401)
    if payload.get('role') != 'admin':
        return None, (jsonify({'error': 'Admin access required'}), 403)
    return payload, None

@app.route('/api/reports', methods=['GET'])
def get_reports():
    payload = _get_user_from_token()
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, type, created_at FROM user_reports WHERE user_id = %s ORDER BY created_at DESC",
            (payload['user_id'],)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        reports = [
            {"id": str(r[0]), "name": r[1], "type": r[2], "created_at": r[3].isoformat()}
            for r in rows
        ]
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports', methods=['POST'])
def create_report():
    payload = _get_user_from_token()
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    name = data.get('name', '').strip()
    report_type = data.get('type', '').strip()
    if not name or not report_type:
        return jsonify({'error': 'name and type are required'}), 400
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO user_reports (user_id, name, type) VALUES (%s, %s, %s) RETURNING id, created_at",
            (payload['user_id'], name, report_type)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"id": str(row[0]), "name": name, "type": report_type, "created_at": row[1].isoformat()}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    payload = _get_user_from_token()
    if not payload:
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM user_reports WHERE id = %s AND user_id = %s",
            (report_id, payload['user_id'])
        )
        conn.commit()
        deleted = cur.rowcount
        cur.close()
        conn.close()
        if deleted == 0:
            return jsonify({'error': 'Report not found'}), 404
        return jsonify({'ok': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

_STATUS_TABLES = ("ww1_enlistment", "ww1_court_martial", "app_user", "user_reports", "api_request_log")

@app.route('/api/admin/status', methods=['GET'])
def admin_status():
    payload, err = _require_admin()
    if err:
        return err

    counts = {}
    db_connected = False
    db_error = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        for table in _STATUS_TABLES:
            try:
                # Table names come from a fixed module-level tuple, never user input.
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                counts[table] = cur.fetchone()[0]
            except Exception:
                conn.rollback()  # a failed statement aborts the tx; recover for the next table
                counts[table] = None
        cur.close()
        conn.close()
        db_connected = True
    except Exception as e:
        db_error = str(e)
        counts = {table: None for table in _STATUS_TABLES}

    ml_models = {
        'decision_tree': os.path.exists(dt_script_path),
        'logistic_regression': os.path.exists(lr_script_path),
        'naive_bayes': os.path.exists(nb_script_path),
    }

    return jsonify({
        'backend': 'online',
        'database': {'connected': db_connected, 'error': db_error, 'counts': counts},
        'ml_models': ml_models,
    }), 200

@app.route('/api/admin/logs', methods=['GET'])
def admin_logs():
    payload, err = _require_admin()
    if err:
        return err

    try:
        limit = int(request.args.get('limit', 100))
    except (TypeError, ValueError):
        limit = 100
    limit = max(1, min(limit, 500))

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, ts, method, path, status_code, duration_ms, username "
            "FROM api_request_log ORDER BY ts DESC, id DESC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        logs = [
            {
                'id': r[0],
                'timestamp': r[1].isoformat() if r[1] else None,
                'method': r[2],
                'path': r[3],
                'status_code': r[4],
                'duration_ms': round(r[5], 1) if r[5] is not None else None,
                'username': r[6],
            }
            for r in rows
        ]
        return jsonify({'logs': logs, 'count': len(logs)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)