# TimeVault Technologies

## Team

**Team name:** TimeVault Technologies  
**Members:** Noel Johnston, Adam Mohamed, Tiffany-Miruna Mares, Huraimah Fatima, Surena Moosavi, Konrad Polkowski, Aly Sibak, Marcus Amaral

## What is this?

TimeVault is a web application that lets users explore aggregate courts martial and service record patterns from the Canadian Expeditionary Force (CEF) during World War I (1914-1918). It pulls from a PostgreSQL database of real enlistment and courts martial records, and provides interactive charts, side-by-side comparisons, and machine learning analysis to help surface patterns in the data.

The system supports three user roles: guests can browse freely without an account, registered viewers can save reports, and admins have access to pipeline health and system logs.

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for dev server and bundling
- Tailwind CSS with a custom theme (light and night mode)
- Recharts for all chart visualizations
- React Router for client-side routing
- Radix UI primitives (Toast, Tooltip)
- Lucide React icons
- html2canvas + jsPDF for PNG and PDF report exports

### Backend

- Python with Flask, running as a REST API on port 5001
- PostgreSQL for the database
- PyJWT for authentication tokens (24-hour expiry, HS256)
- psycopg2 for PostgreSQL connectivity
- Werkzeug for password hashing
- python-dotenv for loading environment variables
- Flask-CORS for cross-origin request support

### Machine Learning

- scikit-learn for all three models
- NumPy and Pandas for data manipulation
- Matplotlib and Seaborn for backend-side visualization

Three ML methods are available:

- **Decision Tree** - builds a classification tree that predicts whether a soldier would be court-martialled based on selected demographic features. The result is an interactive, expandable tree visualization with colour-coded leaf nodes showing court martial rates relative to the baseline.
- **Logistic Regression** - fits a regression model that assigns a numerical coefficient to every feature value, ranking them by how much they increase or decrease court martial likelihood. Results are shown as a diverging bar chart with positive (increases risk) and negative (decreases risk) directions.
- **Naive Bayes** - a pattern discovery tool (not a prediction model) that focuses on soldiers who were court-martialled and identifies which ranks, unit types, and enlistment years are overrepresented or underrepresented within each offence category. Uses lift metrics, conditional probability heatmaps, and stacked breakdowns.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm
- Python 3.8+
- PostgreSQL

## Setting Up PostgreSQL

Before anything else, you need PostgreSQL installed and running on your machine. The setup is slightly different depending on your operating system.

### Windows

1. Download the installer from the [official PostgreSQL site](https://www.postgresql.org/download/windows/) and run it. The interactive installer from EDB is the easiest option.
2. During installation, it will ask you to set a password for the default `postgres` user. Remember this password, you will need it later for the `.env` file.
3. Leave the default port as `5432` unless you have a reason to change it.
4. Once installed, PostgreSQL runs as a Windows service automatically. You can verify it is running by opening **pgAdmin** (installed alongside PostgreSQL) or by running `psql -U postgres` in a terminal. If the `psql` command is not found, you may need to add PostgreSQL's `bin` folder (e.g. `C:\Program Files\PostgreSQL\16\bin`) to your system PATH.

### macOS

The simplest approach is to install via Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
```

This installs PostgreSQL and starts it as a background service that persists across reboots. By default on macOS, the `postgres` user may not have a password set. You can create one by running:

```bash
psql postgres -c "ALTER USER postgres PASSWORD 'your-password-here';"
```

Alternatively, you can download [Postgres.app](https://postgresapp.com/) if you prefer a GUI-based setup.

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

PostgreSQL starts automatically after installation. Switch to the `postgres` system user to set a password:

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your-password-here';"
```

On Fedora or RHEL-based distros, replace `apt` with `dnf` and the package name is the same.

### Verifying the installation

Regardless of your OS, you should be able to connect with:

```bash
psql -U postgres -h localhost
```

If that drops you into the PostgreSQL prompt, you are good to go. Type `\q` to exit.

## Getting Started

### 1. Set up the database

Install the Python dependencies first, then run the setup script. It handles everything: creates the `ww1_db` database, loads the schema, imports the enlistment and courts martial CSV data, generates the joined tables, and creates a `.env` file from `.env.example` if one doesn't exist yet.

```bash
pip install -r requirements.txt
python setup_db.py
```

On Linux/Mac, use `python3` instead of `python`.

Once it's done, edit the `.env` file to set your PostgreSQL password (the one you chose during installation) and optionally a custom JWT secret:

```
DB_HOST=localhost
DB_NAME=ww1_db
DB_USER=postgres
DB_PASSWORD=your-password-here
DB_PORT=5432
JWT_SECRET=your-secret-here
```

### 2. Start the backend

```bash
python src/backend/route.py
```

Flask will start on **http://localhost:5001** with debug mode enabled, so it auto-reloads when you edit backend files.

### 3. Start the frontend

Open a second terminal:

```bash
npm install
npm run dev
```

Vite will start on **http://localhost:8080**. All `/api` requests are proxied to the Flask backend automatically (configured in `vite.config.ts`).

### Test credentials

**Admin login:**
- Username: `TimeVaultAdmin`
- Password: `Grape!`

Guest access is available from the landing page without any credentials.

## How the App Works

### User flow

When you open the app, you land on a sign-in page with three options: continue as a guest, sign in as a registered user, or log in as an admin. Guests and signed-in users see the same main menu. The difference is that signed-in users can save reports to their dashboard. Admins are taken to a separate dashboard with pipeline status, system health, and log access.

### Main menu

The main menu has five modules:

1. **Offence Trends** - an overview of offence frequencies and demographic breakdowns across the courts martial dataset. Users can filter by year range, rank, unit type, and offence codes, then view the data through bar charts, line charts, or pie charts. The page also surfaces key insights and historical context.

2. **Compare** - side-by-side comparison of disciplinary patterns between two user-defined groups. Supports single-category comparisons (e.g. Privates vs Corporals) and double-category comparisons (e.g. Infantry + Privates vs Artillery + Privates). Results display grouped bar charts highlighting the differences.

3. **ML Analysis** - the machine learning module. Users pick one of three methods (Decision Tree, Logistic Regression, or Naive Bayes), select which features to include, and click Run Analysis. The system sends the request to the Flask backend, which trains the model on the live database data and returns the results. A processing screen shows progress while the model runs. Results include interactive visualizations, auto-generated key findings, and model performance metrics.

4. **Dataset Info** - metadata about the underlying database: table schemas, column descriptions, record counts, and known data quality issues.

5. **User Manual** - step-by-step guide covering every module, the full list of offence codes from the British Army Act, occupation category examples, and how to interpret the ML results.

### Other pages

- **Export** - after running an analysis, users can export results as PNG screenshots or PDF reports.
- **User Dashboard** - for registered users, shows saved reports and provides quick links back to each module.
- **Admin Dashboard** - for admins, shows pipeline status, system health indicators, and quick actions (view logs, export logs, metadata).

## Authentication

The system uses JWT tokens with a 24-hour expiry. Passwords are hashed with Werkzeug's `generate_password_hash` before storage. There are three auth endpoints:

- `/api/auth/register` - creates a new viewer account
- `/api/auth/login` - viewer login (rejects admin accounts)
- `/api/auth/admin/login` - admin login (rejects non-admin accounts)
- `/api/auth/verify` - validates an existing token

Tokens are stored in `localStorage` and verified on page load. If the backend is unreachable, the existing user state is preserved so the UI doesn't break.

## Project Structure

```
TimeVault/
├── src/
│   ├── frontend/
│   │   ├── assets/            # Logo and images
│   │   ├── components/
│   │   │   ├── ui/            # Base UI (toast, tooltip)
│   │   │   └── wireframe/     # Reusable primitives (WireBox, WireButton, WireInput, etc.)
│   │   ├── data/              # Static lookup data and fallback ML results
│   │   │   ├── ranks.ts, unitTypes.ts, offences.ts, occupations.ts, provinces.ts
│   │   │   ├── decision_tree_results.json
│   │   │   ├── logistic_regression_results.json
│   │   │   └── pattern_analysis.json
│   │   ├── hooks/             # useAuth, useTheme, use-toast
│   │   ├── lib/               # Utility functions and export store
│   │   ├── pages/             # All route-level page components
│   │   ├── App.tsx            # Root component with all routes
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Tailwind base styles and custom theme tokens
│   │
│   └── backend/
│       ├── route.py           # Flask app, all API endpoints
│       ├── database/
│       │   ├── database_schema.sql            # PostgreSQL schema
│       │   ├── helper.py                      # DB connection helper
│       │   ├── compare_page_database.py       # Compare module queries
│       │   ├── offence_trends_page_database.py # Trends module queries
│       │   ├── gen_joined_sql.py              # Generates joined court martial data
│       │   ├── generate_real_data.py          # Processes raw CSV files into SQL
│       │   └── *.sql, *.csv                   # Schema files, data dumps, source CSVs
│       ├── signin/
│       │   └── signin.py      # Auth blueprint (register, login, admin login, verify)
│       └── machine-learning/
│           ├── decision-tree/
│           │   └── decision-tree.py           # Trains DT, returns tree structure + metrics
│           ├── logistic-regression/
│           │   └── logistic_regression.py      # Trains LR, returns coefficients + metrics
│           └── naive-bayes/
│               └── naive_bayes.py             # Pattern discovery, returns probability tables
│
├── public/                    # Static assets (favicon, example tree images)
├── docs/                      # Meeting logs
├── labs/                      # Lab submissions
├── tests/                     # Database and backend tests
├── setup_db.py                # Cross-platform DB setup script
├── index.html                 # Vite HTML entry point
├── vite.config.ts             # Vite config (proxy /api → localhost:5001, @ alias)
├── tailwind.config.ts         # Custom Tailwind theme (colours, fonts)
├── requirements.txt           # Python dependencies
└── package.json               # Node dependencies and scripts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new viewer account |
| POST | `/api/auth/login` | Viewer login (returns JWT) |
| POST | `/api/auth/admin/login` | Admin login (returns JWT) |
| POST | `/api/auth/verify` | Validate an existing token |
| POST | `/api/trends` | Offence trends data with year, rank, unit, and offence filters |
| POST | `/api/compare` | Single or double category group comparisons |
| POST | `/api/run-decision-tree` | Train and return a decision tree with selected features |
| POST | `/api/run-logistic-regression` | Train and return logistic regression coefficients |
| POST | `/api/run-naive-bayes` | Run Naive Bayes pattern discovery |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server (port 8080) |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |
| `python setup_db.py` | Set up the PostgreSQL database from scratch |
| `python src/backend/route.py` | Start the Flask backend (port 5001) |
