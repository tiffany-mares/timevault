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
