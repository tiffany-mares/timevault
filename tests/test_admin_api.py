import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend', 'database'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend', 'signin'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))

import datetime
import pytest
from unittest.mock import patch, MagicMock

from signin import generate_token


@pytest.fixture
def client():
    from route import app
    app.config['TESTING'] = True
    return app.test_client()


def _admin_headers():
    return {"Authorization": f"Bearer {generate_token(1, 'TimeVaultAdmin', 'admin')}"}


def _viewer_headers():
    return {"Authorization": f"Bearer {generate_token(2, 'viewer1', 'viewer')}"}


def _mock_db(mock_get_conn):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_conn.return_value = mock_conn
    return mock_conn, mock_cursor


# ---------- after_request logging hook ----------

@patch("route.get_db_connection")
def test_after_request_hook_inserts_row(mock_get_conn, client):
    from route import app
    mock_conn, mock_cursor = _mock_db(mock_get_conn)

    app.config['LOG_REQUESTS_IN_TESTS'] = True
    try:
        resp = client.get("/api/does-not-exist")
        assert resp.status_code == 404
    finally:
        # route.app is a module singleton shared across test files - always reset
        app.config['LOG_REQUESTS_IN_TESTS'] = False

    assert mock_cursor.execute.called
    sql, params = mock_cursor.execute.call_args[0]
    assert "INSERT INTO api_request_log" in sql
    assert params[0] == "GET"
    assert params[1] == "/api/does-not-exist"
    assert params[2] == 404
    assert isinstance(params[3], float) and params[3] >= 0
    assert params[4] is None  # unauthenticated
    mock_conn.commit.assert_called_once()


@patch("route.get_db_connection")
def test_after_request_hook_skipped_when_testing(mock_get_conn, client):
    resp = client.get("/api/does-not-exist")
    assert resp.status_code == 404
    mock_get_conn.assert_not_called()


@patch("route.get_db_connection")
def test_after_request_hook_skips_admin_paths(mock_get_conn, client):
    from route import app
    app.config['LOG_REQUESTS_IN_TESTS'] = True
    try:
        client.get("/api/admin/anything")
    finally:
        app.config['LOG_REQUESTS_IN_TESTS'] = False
    for call in mock_get_conn.return_value.cursor.return_value.execute.call_args_list:
        assert "INSERT INTO api_request_log" not in call[0][0]


@patch("route.get_db_connection")
def test_after_request_hook_swallows_db_errors(mock_get_conn, client):
    from route import app
    mock_get_conn.side_effect = Exception("connection refused")

    app.config['LOG_REQUESTS_IN_TESTS'] = True
    try:
        resp = client.get("/api/does-not-exist")
        assert resp.status_code == 404
    finally:
        app.config['LOG_REQUESTS_IN_TESTS'] = False


@patch("route.get_db_connection")
def test_after_request_hook_skips_options(mock_get_conn, client):
    from route import app
    app.config['LOG_REQUESTS_IN_TESTS'] = True
    try:
        client.options("/api/does-not-exist")
    finally:
        app.config['LOG_REQUESTS_IN_TESTS'] = False
    mock_get_conn.assert_not_called()


@patch("route.get_db_connection")
def test_after_request_hook_skips_non_api_paths(mock_get_conn, client):
    from route import app
    app.config['LOG_REQUESTS_IN_TESTS'] = True
    try:
        client.get("/not-api")
    finally:
        app.config['LOG_REQUESTS_IN_TESTS'] = False
    mock_get_conn.assert_not_called()


# ---------- /api/admin/status ----------

def test_status_requires_token(client):
    resp = client.get("/api/admin/status")
    assert resp.status_code == 401


def test_status_rejects_viewer(client):
    resp = client.get("/api/admin/status", headers=_viewer_headers())
    assert resp.status_code == 403


@patch("route.get_db_connection")
def test_status_success(mock_get_conn, client):
    mock_conn, mock_cursor = _mock_db(mock_get_conn)
    # One COUNT(*) per table, in _STATUS_TABLES order
    mock_cursor.fetchone.side_effect = [(57000,), (11000,), (2,), (5,), (123,)]

    resp = client.get("/api/admin/status", headers=_admin_headers())
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["backend"] == "online"
    assert data["database"]["connected"] is True
    assert data["database"]["counts"]["ww1_enlistment"] == 57000
    assert data["database"]["counts"]["api_request_log"] == 123
    assert set(data["ml_models"].keys()) == {"decision_tree", "logistic_regression", "naive_bayes"}
    assert all(isinstance(v, bool) for v in data["ml_models"].values())


@patch("route.get_db_connection")
def test_status_reports_db_down(mock_get_conn, client):
    mock_get_conn.side_effect = Exception("connection refused")

    resp = client.get("/api/admin/status", headers=_admin_headers())
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["database"]["connected"] is False
    assert "connection refused" in data["database"]["error"]
    assert data["database"]["counts"]["ww1_enlistment"] is None


# ---------- /api/admin/logs ----------

def test_logs_requires_token(client):
    resp = client.get("/api/admin/logs")
    assert resp.status_code == 401


def test_logs_rejects_viewer(client):
    resp = client.get("/api/admin/logs", headers=_viewer_headers())
    assert resp.status_code == 403


@patch("route.get_db_connection")
def test_logs_success_default_limit(mock_get_conn, client):
    mock_conn, mock_cursor = _mock_db(mock_get_conn)
    ts = datetime.datetime(2026, 8, 1, 12, 0, 0)
    mock_cursor.fetchall.return_value = [
        (2, ts, "GET", "/api/reports", 200, 12.5, "viewer1"),
        (1, ts, "POST", "/api/trends", 200, 88.14, None),
    ]

    resp = client.get("/api/admin/logs", headers=_admin_headers())
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["count"] == 2
    assert data["logs"][0]["method"] == "GET"
    assert data["logs"][0]["username"] == "viewer1"
    assert data["logs"][1]["username"] is None
    assert data["logs"][1]["duration_ms"] == 88.1
    # default limit is 100
    assert mock_cursor.execute.call_args[0][1] == (100,)


@patch("route.get_db_connection")
def test_logs_limit_clamped_to_500(mock_get_conn, client):
    mock_conn, mock_cursor = _mock_db(mock_get_conn)
    mock_cursor.fetchall.return_value = []

    resp = client.get("/api/admin/logs?limit=9999", headers=_admin_headers())
    assert resp.status_code == 200
    assert mock_cursor.execute.call_args[0][1] == (500,)


@patch("route.get_db_connection")
def test_logs_invalid_limit_uses_default(mock_get_conn, client):
    mock_conn, mock_cursor = _mock_db(mock_get_conn)
    mock_cursor.fetchall.return_value = []

    resp = client.get("/api/admin/logs?limit=abc", headers=_admin_headers())
    assert resp.status_code == 200
    assert mock_cursor.execute.call_args[0][1] == (100,)
