# Loaded by pytest before any test module is imported. Set a strong JWT secret
# up front so tests are deterministic and never exercise signin's ephemeral
# fallback. A length >= 32 bytes avoids PyJWT's InsecureKeyLengthWarning.
import os

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production-use")
