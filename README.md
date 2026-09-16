# LabFlow —SDLMS

LabFlow is a microservices-based platform for managing the end-to-end workflow of a diagnostic laboratory: patient registration, doctor referrals, test bookings, sample collection, results, verification, billing, notifications, reporting, and a unified dashboard — all fronted by a single API gateway and a React web app.


## Architecture

LabFlow follows a microservices architecture. Each domain (patients, doctors, tests, bookings, etc.) is an independent NestJS service with its own MongoDB database, communicating internally over HTTP. A single API gateway is the only public entry point and proxies requests to the appropriate downstream service.

```
                         ┌───────────────┐
                         │   Frontend    │
                         │ (React + Vite)│
                         └───────┬───────┘
                                 │
                         ┌───────▼───────┐
                         │  API Gateway  │
                         └───────┬───────┘
                                 │
   ┌──────────────┬─────────────┼─────────────┬──────────────┐
   │              │             │             │              │
┌──▼───┐      ┌───▼───┐     ┌───▼───┐     ┌───▼───┐      ┌───▼────┐
│ Auth │      │Patient│     │Doctor │     │ Test  │      │Booking │  ...
└──────┘      └───────┘     └───────┘     └───────┘      └────────┘
```

Additional services — **Sample**, **Result**, **Verification**, **Billing**, **Notification**, **Report**, and **Dashboard** — round out the lab workflow, each calling into its peers where needed (e.g. the Verification service depends on Result, Sample, Doctor, Patient, Report, and Notification).

## Tech Stack

| Layer            | Technology                                                |
|------------------|------------------------------------------------------------|
| Frontend         | React 18, TypeScript, Vite, Tailwind CSS, React Router     |
| Backend services | NestJS, TypeScript, JWT auth                    |
| API Gateway      | NestJS + `http-proxy-middleware`                            |
| Database         | MongoDB (Atlas in Docker/prod, local Mongo optional)        |
| Notifications    | SMTP-based email notifications                              |
| Testing          | Jest, ts-jest                                                |
| Containerization | Docker, Docker Compose                                       |
| Deployment       | Render (`render.yaml`), Firebase Hosting (frontend)          |
| Monorepo         | npm workspaces                                                |

## Project Structure

```
LABFLOW-SDLMS/
├── frontend/                   # React + Vite web application
│   └── src/
├── backend/
│   ├── api-gateway/            # Public entry point, request routing
│   └── services/
│       ├── auth-service/
│       ├── patient-service/
│       ├── doctor-service/
│       ├── test-service/
│       ├── booking-service/
│       ├── sample-service/
│       ├── result-service/
│       ├── verification-service/
│       ├── billing-service/
│       ├── notification-service/
│       ├── report-service/
│       └── dashboard-service/
├── packages/
│   ├── ui/                     # Shared UI components
│   └── utils/                  # Shared utilities
├── scripts/
│   └── validate-structure.js   # Repo scaffolding validator
├── docker-compose.yml
├── render.yaml                 # Render deployment blueprint
└── package.json                 # npm workspaces root
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) 9 or later
- [Docker](https://www.docker.com/) and Docker Compose (for running the full backend stack)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or a local MongoDB instance if you adapt the connection strings)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/LABFLOW-SDLMS.git
cd LABFLOW-SDLMS
```

### 2. Configure environment variables

Copy the example environment files and fill in real values:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

At minimum you'll need a MongoDB Atlas user/password/cluster, a JWT secret, and (optionally) SMTP credentials for email notifications. See [Environment Variables](#environment-variables) below.

### 3. Run with Docker Compose

This builds and starts every backend microservice plus the API gateway:

```bash
docker compose up --build
```

The API gateway will be available at **http://localhost:3000**, proxying requests to each internal service.

### 4. Run the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at the URL Vite prints (typically **http://localhost:5173**).

## Environment Variables

Shared variables (root `.env`, consumed by `docker-compose.yml`):

| Variable                   | Description                                                    |
|----------------------------|------------------------------------------------------------------|
| `ATLAS_USER`               | MongoDB Atlas username                                          |
| `ATLAS_PASSWORD`           | MongoDB Atlas password                                          |
| `ATLAS_CLUSTER`            | MongoDB Atlas cluster host (e.g. `cluster0.ab1cd.mongodb.net`)    |
| `JWT_SECRET`               | Secret used to sign/verify JWTs across services                  |
| `INTERNAL_SERVICE_SECRET`  | Shared secret for trusted service-to-service calls                |
| `SMTP_HOST` / `SMTP_PORT`  | SMTP server for outgoing notification emails                      |
| `SMTP_USER` / `SMTP_PASS`  | SMTP credentials                                                   |
| `SMTP_FROM`                | Default "from" address for emails                                  |
| `SMTP_SECURE`              | Whether to use TLS for SMTP (`true`/`false`)                        |

Each service also has its own `PORT` and `MONGODB_URI` (scoped to its own database, e.g. `labflow-auth`, `labflow-patient`, etc.) plus URLs for any downstream services it depends on — all pre-wired in `docker-compose.yml`.

> **Never commit real secrets.** Use `.env` (git-ignored) for local values and your hosting provider's secret manager (e.g. Render environment groups) in production.

## Testing

Run the Jest test suite across backend services from the repo root:

```bash
npm run test:services
```

## Validating the Project Structure

A helper script checks that every service has the expected entry points (`main.ts`, `<service>.module.ts`) and that the frontend has its core files in place:

```bash
npm run validate
```

## Deployment

- **Backend services & API gateway** — deployed as Docker web services on [Render](https://render.com), configured via `render.yaml`. Shared secrets (`JWT_SECRET`, `INTERNAL_SERVICE_SECRET`) are generated automatically through Render's environment groups.
- **Frontend** — deployed to [Firebase Hosting](https://firebase.google.com/products/hosting) via the GitHub Actions workflows in `.github/workflows/`.

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes, following the existing NestJS module conventions for backend services.
3. Run `npm run validate` and `npm run test:services` before opening a pull request.
4. Submit a PR describing the change and its motivation.

---

*LabFlow — streamlining diagnostic lab operations from booking to report.*
