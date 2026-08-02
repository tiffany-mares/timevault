import sys,os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..','src','backend','database'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..','src','backend','signin'))

import pytest
from unittest.mock import patch, MagicMock
import json

os.environ.setdefault("JWT_SECRET","test-secret-key")

from signin import auth_bp, generate_token, decode_token

from flask import Flask

@pytest.fixture
def app():
    a = Flask(__name__)
    a.register_blueprint(auth_bp)
    a.config['TESTING'] = True
    return a

@pytest.fixture
def client(app):
    return app.test_client()


def test_generate_token_returns_string():
    tok = generate_token(1, "testuser", "viewer")
    assert isinstance(tok, str)
    assert len(tok) > 10

def test_decode_token_roundtrip():
    tok = generate_token(42, "admin", "admin")
    payload = decode_token(tok)
    assert payload is not None
    assert payload["user_id"] == 42
    assert payload["username"] == "admin"
    assert payload["role"] == "admin"

def test_decode_token_invalid():
    result = decode_token("this.is.garbage")
    assert result is None

def test_decode_token_empty():
    assert decode_token("") is None


@patch("signin.get_db_connection")
def test_register_success(mock_db, client):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.side_effect = [None, (1,)]
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/register",
        data=json.dumps({"username":"newuser","password":"password123"}),
        content_type="application/json")
    assert resp.status_code == 201
    data = resp.get_json()
    assert "token" in data
    assert data["user"]["username"] == "newuser"
    assert data["user"]["role"] == "viewer"

@patch("signin.get_db_connection")
def test_register_duplicate_user(mock_db, client):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = (1,)
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/register",
        data=json.dumps({"username": "existing","password":"password123"}),
        content_type="application/json")
    assert resp.status_code == 409

def test_register_missing_fields(client):
    resp = client.post("/api/auth/register",
        data=json.dumps({"username":"","password":""}),
        content_type="application/json")
    assert resp.status_code == 400

def test_register_short_password(client):
    resp = client.post("/api/auth/register",
                       data=json.dumps({"username":"someone","password":"abc"}),
                       content_type="application/json")
    assert resp.status_code == 400


@patch("signin.get_db_connection")
def test_login_success(mock_db, client):
    from werkzeug.security import generate_password_hash
    hashed = generate_password_hash("mypassword")

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = (1, "viewer1", hashed, "viewer")
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/login",
        data=json.dumps({"username":"viewer1","password":"mypassword"}),
        content_type="application/json")
    assert resp.status_code == 200
    d = resp.get_json()
    assert d["user"]["role"] == "viewer"

@patch("signin.get_db_connection")
def test_login_wrong_password(mock_db, client):
    from werkzeug.security import generate_password_hash
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = (1, "user1", generate_password_hash("correct"), "viewer")
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/login",
        data=json.dumps({"username":"user1","password":"wrong"}),
        content_type="application/json")
    assert resp.status_code == 401

@patch("signin.get_db_connection")
def test_login_user_not_found(mock_db, client):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = None
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/login",
        data=json.dumps({"username":"nobody","password":"whatever"}),
        content_type="application/json")
    assert resp.status_code == 401

@patch("signin.get_db_connection")
def test_login_rejects_admin(mock_db, client):
    from werkzeug.security import generate_password_hash
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = (1, "adminuser", generate_password_hash("pass"), "admin")
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/login",
        data=json.dumps({"username":"adminuser","password":"pass"}),
        content_type="application/json")
    assert resp.status_code == 403


@patch("signin.get_db_connection")
def test_admin_login_success(mock_db, client):
    from werkzeug.security import generate_password_hash
    hashed = generate_password_hash("Grape!")
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = (1, "TimeVaultAdmin", hashed, "admin")
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/admin/login",
        data=json.dumps({"username":"TimeVaultAdmin","password":"Grape!"}),
        content_type="application/json")
    assert resp.status_code == 200
    assert resp.get_json()["user"]["role"] == "admin"

@patch("signin.get_db_connection")
def test_admin_login_rejects_viewer(mock_db, client):
    from werkzeug.security import generate_password_hash
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = (2, "normaluser", generate_password_hash("pass"), "viewer")
    mock_db.return_value = mock_conn

    resp = client.post("/api/auth/admin/login",
        data=json.dumps({"username":"normaluser","password":"pass"}),
        content_type="application/json")
    assert resp.status_code == 403


def test_verify_valid_token(client):
    tok = generate_token(1, "testuser", "viewer")
    resp = client.post("/api/auth/verify",
        data=json.dumps({"token": tok}),
        content_type="application/json")
    assert resp.status_code == 200
    d = resp.get_json()
    assert d["valid"] == True
    assert d["user"]["username"] == "testuser"

def test_verify_invalid_token(client):
    resp = client.post("/api/auth/verify",
        data=json.dumps({"token":"bad.token.here"}),
        content_type="application/json")
    assert resp.status_code == 401
    assert resp.get_json()["valid"] == False

def test_verify_empty_token(client):
    resp = client.post("/api/auth/verify",
                       data=json.dumps({"token":""}),
                       content_type="application/json")
    assert resp.status_code == 401
