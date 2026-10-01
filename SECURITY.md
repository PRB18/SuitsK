# Security Policy

## Required Environment Variables
The application requires the following environment variables to run securely in production:
- `SESSION_SECRET`: Must be a long, random cryptographic string used to sign session cookies and CSRF tokens.
- `VAULT_PASSWORD_HASH`: The bcrypt hash of the global atelier password.
- `TURSO_DATABASE_URL`: The URL for the Turso libSQL database.
- `TURSO_AUTH_TOKEN`: The authentication token for the Turso database.

## Security Policies
- **No Dynamic Code Execution**: The use of `eval()`, `new Function()`, `setTimeout(string)`, or any dynamic code execution is strictly prohibited. This is enforced via ESLint rules.
- **No Shell Execution**: The use of `child_process` (such as `exec`, `spawn`, `fork`) is strictly prohibited to prevent Command Injection vulnerabilities.
- **Input Validation**: All incoming requests that mutate data must be validated against Zod schemas.

## Reporting Vulnerabilities
If you discover a security vulnerability within this project, please report it to the development team immediately. Do not disclose vulnerabilities publicly until they have been patched.
