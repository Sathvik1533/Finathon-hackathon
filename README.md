# Finathon Hackathon - Modular Authentication Architecture

This repository hosts the modular authentication architecture for **Finathon** on branch `auth`. It features a production-ready **Node.js & Express.js** backend delivering JWT authentication, dual **PostgreSQL / Supabase** database adapters, an interactive frontend authentication screen, Model Context Protocol (MCP) tooling, and complete integration specifications for **Next.js**.

---

## 🚀 Features

- **JWT Authentication**: Secure Bearer tokens (`HS256`) with 7-day configurable validity and token verification middleware.
- **Password Security**: Strong salt-hashed passwords using `bcryptjs`.
- **Database & Supabase Integration**:
  - **Supabase**: Managed cloud PostgreSQL with connection pooling & `@supabase/supabase-js` SDK.
  - **Native PostgreSQL**: Transaction & session pooler support via `pg`.
  - **Zero-Config Embedded Store**: Instant local development and test runner support without external database dependencies.
- **Supabase Model Context Protocol (MCP)**:
  - Official `@supabase/mcp-server-supabase` and `@modelcontextprotocol/server-postgres` pre-configured in [`mcp_config.json`](./mcp_config.json) for AI-driven migrations, schema inspections, and queries.
- **Wired Frontend (Screen 1)**: Pure, responsive glassmorphism UI connected to live endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`) with active session status and token verification.
- **Contract & Documentation**:
  - Full API specification in [`contract.ini`](./contract.ini).
  - Supabase setup and MCP guide in [`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md).
  - Detailed Next.js frontend consumer guide in [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md).
- **100% Passing Test Suite**: Automated unit and integration tests powered by Jest and Supertest.

---

## 📁 Repository Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration (JWT, Postgres, Supabase)
│   │   ├── controllers/     # AuthController (register, login, me, logout)
│   │   ├── db/              # Dual PostgreSQL, Supabase & in-memory adapter
│   │   │   ├── index.js     # Unified query adapter
│   │   │   └── supabase.js  # Supabase client initializer
│   │   ├── middleware/      # JWT auth guard & express-validator rules
│   │   ├── models/          # UserModel for user persistence
│   │   ├── routes/          # authRoutes (/api/auth)
│   │   ├── app.js           # Express app configuration & middleware
│   │   └── server.js        # Server launcher (default port 5001)
│   ├── tests/
│   │   └── auth.test.js     # 14 comprehensive Jest/Supertest unit & integration tests
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── API_DOCUMENTATION.md # Full API reference & Next.js client integration guide
│   └── SUPABASE_SETUP.md    # 60-second Supabase setup & MCP server guide
├── mcp_config.json          # MCP configuration for Supabase and Postgres
├── contract.ini             # INI format API & interface contract
├── index.html               # Screen 1 UI (Sign In, Sign Up & Authenticated State)
├── styles.css               # Modern glassmorphism UI styles
├── script.js                # Frontend client logic wired to Node.js backend
├── .gitignore
└── README.md
```

---

## 🛠️ Quick Start

### 1. Install & Run the Node.js Backend

```bash
cd backend
npm install
npm start
```

The backend server starts on: **`http://localhost:5001`**

### 2. Configure Supabase (Optional for local dev, recommended for production)

In `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.yourproject:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
See the complete guide in [`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md).

### 3. Run the Frontend

Open `index.html` in your browser or access through the Express server:

```bash
# Option A: Open directly in browser
open index.html

# Option B: Access through Express backend:
# http://localhost:5001/index.html
```

---

## 🔌 Supabase MCP Server

Run the Supabase MCP Server with:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxx"
export SUPABASE_PROJECT_REF="your-project-id"
npx -y @supabase/mcp-server-supabase
```
Configuration is saved in [`mcp_config.json`](./mcp_config.json).

---

## 🧪 Running Tests

The test suite runs with Jest and Supertest in isolated memory mode:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- ✅ Health check probe (`GET /api/health`)
- ✅ User registration with validation (`POST /api/auth/register`)
- ✅ Rejection of duplicate email addresses (409 Conflict)
- ✅ Password length and email format constraints (400 Bad Request)
- ✅ User login with bcrypt verification (`POST /api/auth/login`)
- ✅ Rejection of incorrect passwords and unknown accounts (401 Unauthorized)
- ✅ Protected profile route with Bearer token (`GET /api/auth/me`)
- ✅ User session termination (`POST /api/auth/logout`)

---

## 📄 API Contract Summary (`contract.ini`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | Service health check |
| `POST` | `/api/auth/register` | No | Create account & return JWT |
| `POST` | `/api/auth/login` | No | Authenticate & return JWT |
| `GET` | `/api/auth/me` | Yes (`Bearer`) | Retrieve current user profile |
| `POST` | `/api/auth/logout` | Yes (`Bearer`) | Logout & invalidate session |

For Next.js frontend code templates, custom hooks (`useAuth`), and middleware setups, see [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md).
