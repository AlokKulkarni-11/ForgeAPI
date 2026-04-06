# ForgeAPI Project Guide

Last updated: April 2, 2026

## 1. Project Overview

**ForgeAPI** is an AI-assisted backend generation platform focused on turning structured API requirements into a working backend workflow.

The current product direction is:

- collect backend requirements from the user
- persist them to Supabase-backed project records
- visualize a multi-agent pipeline for generation, testing, scoring, and healing
- provide a workspace-style UI for code, endpoints, logs, and exports
- grow toward a full autonomous backend generation loop

In short: ForgeAPI aims to let a user describe an API, have AI agents generate it, validate it, score it, and prepare it for export or deployment.

## 2. Purpose

The project is meant to solve these problems:

- reduce the time needed to scaffold production-style backend APIs
- make backend generation accessible to students, hackathon builders, frontend developers, and founders
- expose the generation pipeline in a visible, interactive way instead of hiding everything behind one button
- combine API scaffolding with testing, security scoring, and healing iterations

## 3. Current Product State

The project already has a strong frontend product shell and a partially implemented backend.

### What is implemented and working now

- React + Vite + TypeScript frontend
- Supabase client authentication
- login and register flows
- GitHub OAuth sign-in button on login
- protected routes
- dashboard for saved APIs
- multi-step API creation flow
- workspace UI with Monaco editor and terminal/log panel
- API details page
- settings/profile screen
- REST backend with authenticated API and profile routes
- Supabase-backed persistence for `apis` and `api_requirements`
- polling-based pipeline feed endpoint
- ZIP export endpoint stub
- GitHub export endpoint stub
- dark neon landing/auth visual system

### What is partially implemented or scaffolded

- AI agents exist as backend modules but are not fully wired into a real end-to-end generation pipeline
- sandbox deployment is mocked
- pipeline orchestration exists but is not yet triggered as the actual production flow
- workspace code is currently placeholder/generated sample content
- ZIP export returns sample files, not a real generated project bundle
- GitHub export returns a mock repository URL
- security and testing reports are represented in schema and UI, but not fully generated from a live execution loop

## 4. Frontend Features Implemented

### Public experience

- custom landing page with animated neon tunnel background
- glassmorphism navbar
- tuned ForgeAPI wordmark
- animated pipeline strip
- reveal-style feature cards
- styled login and register pages with matching background system
- back button on auth pages

### Auth and user access

- Supabase email/password login
- Supabase registration
- GitHub OAuth trigger
- auth state handling with Zustand
- protected route wrapper for authenticated areas

### Authenticated app

- dashboard with API stats, status badges, search, and filters
- create API wizard with:
  - entities and fields
  - auth selection
  - framework and database selection
  - test mode selection
  - payload preview
- workspace with:
  - file sidebar
  - endpoint list
  - Monaco code viewer
  - pipeline terminal
- API details page with:
  - requirements tab
  - endpoints tab
  - security tab
  - export controls
- settings/profile page

### Frontend architecture notes

- app source has already been migrated from JSX to TSX
- WebSocket was intentionally removed
- pipeline updates now use REST polling

## 5. Backend Features Implemented

### Implemented backend capabilities

- Express server with CORS and JSON middleware
- health route: `GET /health`
- auth middleware using Supabase token validation
- API routes:
  - `GET /api/apis`
  - `POST /api/apis`
  - `GET /api/apis/:id`
  - `GET /api/apis/:id/pipeline`
  - `GET /api/apis/:id/export/zip`
  - `POST /api/apis/:id/export/github`
- user routes:
  - `GET /api/user/profile`
  - `PUT /api/user/profile`
- pipeline log read/write service

### Backend logic that is present but not production-complete

- orchestrator module for requirement -> generation -> testing -> scoring -> healing
- agent modules for:
  - requirement parsing
  - generation
  - testing
  - scoring
  - healing
- sandbox manager abstraction

### Current backend limitations

- no true end-to-end pipeline execution from API creation to generated files
- mocked sandbox deployment
- mocked ZIP and GitHub export payloads
- no formal test suite yet
- some agent flows still use placeholder logic and comments rather than live provider integrations

## 6. Database Model

Current SQL schema is in `database/schema.sql`.

### Core tables

- `users`
- `apis`
- `api_files`
- `api_endpoints`
- `api_requirements`
- `pipeline_logs`
- `security_reports`
- `test_reports`

### Schema intent

- `users`: profile, provider configuration, preferences, tokens
- `apis`: one project/API record per generated backend
- `api_requirements`: structured request payload for generation
- `api_files`: generated code file storage
- `api_endpoints`: generated endpoint metadata
- `pipeline_logs`: terminal/event feed for the workspace
- `security_reports`: OWASP/security scoring history
- `test_reports`: functional/security test run summaries

## 7. Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand
- Axios
- Monaco Editor
- Lucide React
- Three.js
- postprocessing
- face-api.js (installed, not currently central to the shipped background effect)
- react-hot-toast

### Backend

- Node.js
- Express 5
- CommonJS modules
- Supabase JS SDK
- Axios
- JWT
- bcrypt
- zod
- archiver
- CORS
- dotenv
- http-proxy-middleware
- Google Generative AI SDK

### AI provider notes

- Gemini is API-based
- Ollama is also intended to be API-based in this project
- do not assume a local `http://localhost:11434` Ollama instance unless explicitly reconfigured for local development
- Gemini is the current provider responsible for requirement parsing, code generation, and healing
- Ollama is intended for backend-side testing/scoring style flows when that provider integration is wired
- `GITHUB_TOKEN` is for code export/push to GitHub, not for user sign-in
- GitHub login is handled through Supabase Auth OAuth configuration

### Platform / data

- Supabase Auth
- Supabase database

## 8. Current AI / Pipeline Story

ForgeAPI is designed around a multi-agent workflow:

1. Requirement Agent
2. Generation Agent
3. Testing Agent
4. Scoring Agent
5. Healing Agent

The UI and architecture already reflect this model, but the backend execution is still partly scaffolded.

### Important current truth

- the product experience is ahead of the backend automation depth
- the UI already sells the agentic workflow
- the backend still needs full orchestration, file persistence, sandbox execution, and export realism

## 9. Routes and Pages

### Frontend routes

- `/` landing
- `/login` login
- `/register` register
- `/dashboard` dashboard
- `/create` create API
- `/workspace/:id` workspace
- `/api/:id` API details
- `/settings` settings

### Backend routes

- `/health`
- `/api/apis/*`
- `/api/user/*`

## 10. Environment Variables

### Client

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

### Server

- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SANDBOX_API_KEY`
- `GEMINI_API_KEY`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_API_KEY`
- `GITHUB_TOKEN`

### Environment meaning

- `SANDBOX_API_KEY`: used by the backend sandbox/deployment integration
- `GEMINI_API_KEY`: used by the Gemini-backed agents for specification parsing, generation, and healing
- `OLLAMA_BASE_URL` / `OLLAMA_API_KEY`: intended for the backend testing/scoring provider path
- `GITHUB_TOKEN`: intended for repository export/push features
- Supabase GitHub login does not use `GITHUB_TOKEN`; it uses Supabase OAuth provider setup in the Supabase dashboard

## 11. How to Run

### Client

```bash
cd client
npm install
npm run dev
```

### Server

```bash
cd server
npm install
npm run dev
```

## 12. What Has Been Polished Recently

- full TS/TSX migration on the client
- demo mode removed in favor of real backend/Supabase path
- WebSocket removed and replaced with polling
- landing page redesigned with neon tunnel background
- login/register pages redesigned to match landing experience
- navbar upgraded to glassmorphism
- pipeline strip improved visually
- feature section converted into reveal cards

## 13. Priority Next Steps

### High priority

- trigger the real orchestrator after API creation
- persist generated files into `api_files`
- replace placeholder workspace code with real generated code
- connect testing and scoring outputs to the database
- implement true GitHub export
- implement true ZIP export from stored/generated files
- wire real sandbox provider lifecycle

### Medium priority

- add delete API flow
- add retry / rerun pipeline action
- add better status transitions across dashboard and workspace
- improve loading and empty states across authenticated pages
- add automated tests for frontend and backend

### Nice to have

- streaming logs or finer-grained polling intervals
- richer code diff / revision history
- collaborative or shareable generated APIs
- more frameworks and databases

## 14. Known Gaps / Caveats

- the product is currently best described as a strong frontend and API scaffold with a partially mocked generation backend
- some copy implies fully autonomous generation that is not yet fully backed by production-grade orchestration
- environment examples currently contain real-looking values and should be reviewed before public distribution
- bundle size warnings exist in the client build because of the current dependency set
- this project is configured around an API-based Ollama provider endpoint, not a local Ollama runtime

## 15. Recommended Positioning Right Now

Until the end-to-end generation loop is fully real, the project should be described as:

**An AI-native backend generation platform prototype / advanced scaffold with real auth, real persistence, real dashboard/workspace UX, and a partially implemented autonomous generation pipeline.**
