# This file handles authentication - registration, login, and admin login
import os
import sys
import secrets
import jwt
import datetime
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from helper import get_db_connection

auth_bp = Blueprint('auth', __name__)


def _resolve_jwt_secret(configured):
    """Return the JWT signing secret. Use the configured value if present;
    otherwise generate a random ephemeral secret so no weak, known key ever
    ships in source. A random secret means tokens do not survive a restart -
    set JWT_SECRET in .env for persistent sessions."""
    if configured:
        return configured
    print(
        "WARNING: JWT_SECRET is not set - using a random ephemeral secret. "
        "Tokens will not persist across restarts; set JWT_SECRET in .env.",
        file=sys.stderr,
    )
    return secrets.token_hex(32)


# Load the JWT secret from the environment; never fall back to a known literal.
JWT_SECRET = _resolve_jwt_secret(os.getenv("JWT_SECRET"))
JWT_EXPIRY_HOURS = 24

def generate_token(user_id: int, username: str, role: str) -> str:
    """Generate a signed JWT token for the given user."""
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT token. Returns payload or None if invalid."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Register a new user account
@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM app_user WHERE username = %s", (username,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Username already exists.'}), 409

        password_hash = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO app_user (username, password_hash, role) VALUES (%s, %s, %s) RETURNING id",
            (username, password_hash, 'viewer')
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

        token = generate_token(user_id, username, 'viewer')
        return jsonify({
            'token': token,
            'user': {'id': user_id, 'username': username, 'role': 'viewer'}
        }), 201

    except Exception as e:
        return jsonify({'error': f'Registration failed: {e}'}), 500

# Log in as a regular user (viewer)
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, username, password_hash, role FROM app_user WHERE username = %s",
            (username,)
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return jsonify({'error': 'Username not found.'}), 401

        if not check_password_hash(user[2], password):
            return jsonify({'error': 'Incorrect password.'}), 401

        if user[3] != 'viewer':
            return jsonify({'error': 'Please use the admin login page.'}), 403

        token = generate_token(user[0], user[1], user[3])
        return jsonify({
            'token': token,
            'user': {'id': user[0], 'username': user[1], 'role': user[3]}
        }), 200

    except Exception as e:
        return jsonify({'error': f'Login failed: {e}'}), 500

# Log in as an admin
@auth_bp.route('/api/auth/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, username, password_hash, role FROM app_user WHERE username = %s",
            (username,)
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return jsonify({'error': 'Username not found.'}), 401

        if not check_password_hash(user[2], password):
            return jsonify({'error': 'Incorrect password.'}), 401

        if user[3] != 'admin':
            return jsonify({'error': 'This account does not have admin privileges.'}), 403

        token = generate_token(user[0], user[1], user[3])
        return jsonify({
            'token': token,
            'user': {'id': user[0], 'username': user[1], 'role': user[3]}
        }), 200

    except Exception as e:
        return jsonify({'error': f'Login failed: {e}'}), 500

# Verify a token is still valid (optional - useful for page refresh)
@auth_bp.route('/api/auth/verify', methods=['POST'])
def verify():
    data = request.json
    token = data.get('token', '')
    payload = decode_token(token)
    if not payload:
        return jsonify({'valid': False}), 401
    return jsonify({'valid': True, 'user': {
        'id': payload['user_id'],
        'username': payload['username'],
        'role': payload['role'],
    }}), 200
