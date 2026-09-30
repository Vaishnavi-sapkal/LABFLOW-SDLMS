# Combined Render container deployment

`Dockerfile.combined` runs the API gateway and all 12 NestJS services in one
container. The gateway is the only public process. The combined supervisor sets
`BIND_HOST=127.0.0.1` for each backend service; inter-service requests never
use the old Render service URLs. `BIND_HOST` is otherwise unset, preserving the
existing standalone and Compose network behavior.

## Process map

| Process | Port | Health path | Database |
| --- | ---: | --- | --- |
| API gateway | Render `PORT` (default `10000`) | `/health`, `/ready` | none |
| auth-service | 3001 | `/health` | `labflow-auth` |
| patient-service | 3002 | `/health` | `labflow-patient` |
| test-service | 3003 | `/health` | `labflow-test` |
| booking-service | 3004 | `/health` | `labflow-booking` |
| doctor-service | 3005 | `/health` | `labflow-doctor` |
| sample-service | 3006 | `/health` | `labflow-sample` |
| result-service | 3007 | `/results/health` | `labflow-result` |
| verification-service | 3008 | `/health` | `labflow-verification` |
| billing-service | 3009 | `/health` | `labflow-billing` |
| notification-service | 3010 | `/notifications/health` | `labflow-notification` |
| report-service | 3011 | `/health` | `labflow-report` |
| dashboard-service | 3012 | `/dashboard/health` | none |

The supervisor starts the public API gateway first, then starts all backend
processes concurrently. This lets Render detect its assigned `PORT` while the
private services connect to Atlas. It waits up to five minutes for the verified
health endpoints, logs the failing URL and reason for each service, exits on an
unexpected child exit, and sends SIGTERM to every child during shutdown.

## Required Render configuration

Use [`.env.combined.example`](../.env.combined.example) as a template. Set the
following values in Render; do not commit them:

- `MONGODB_URI`: Atlas URI. The supervisor replaces its database path for each
  service shown above. To use a nonstandard URI for one service, set e.g.
  `AUTH_SERVICE_MONGODB_URI`; the naming format is
  `<UPPERCASE_SERVICE_NAME>_MONGODB_URI`.
- `JWT_SECRET` and `INTERNAL_SERVICE_SECRET`: generated in the Blueprint or
  supplied as secure Render values. They must remain consistent for all child
  processes.
- `FRONTEND_URL`: deployed frontend origin, used in email links.
- SMTP values: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_FROM`, `SMTP_SECURE` when email delivery is needed.
- `UPI_ID` and optional `UPI_PAYEE_NAME` for billing QR generation.

`PORT` is supplied by Render and must not be set to one of the internal ports.
The supervisor defaults the gateway to `10000` only for local use.

## Local build and run

```sh
npm run validate
npm run validate:combined
docker build -f Dockerfile.combined -t labflow-combined .
docker run --rm -p 10000:10000 --env-file .env.combined labflow-combined
curl http://localhost:10000/ready
```

Use a secure local `.env.combined` copied from the example. `/health` is a
liveness endpoint; `/ready` verifies every required backend endpoint with a
bounded two-second request timeout. During cold start, `/health` is available
as soon as the gateway listens while `/ready` remains `503` until every
required service responds successfully.

## Render deployment and rollback

1. Push `feature/render-single-container` and create a new Render Blueprint.
2. Select `render.combined.yaml`, not the existing `render.yaml`.
3. Enter the required environment values above and deploy `labflow-combined`.
4. Wait for `/ready` to return `200`, then perform representative login,
   patient, booking, report, billing, and dashboard requests through the new
   gateway URL.
5. Update the frontend `VITE_API_BASE_URL` to the new gateway URL only after
   verification succeeds.
6. Keep the existing services declared in `render.yaml` running until traffic
   migration is confirmed. To roll back, restore the frontend API base URL to
   the existing gateway and leave the original Blueprint unchanged.
7. Retire old Render services only after monitoring the combined deployment.

The Free plan still sleeps after inactivity; this implementation intentionally
does not send artificial keep-alive traffic. Running 13 Node.js processes on a
single Free instance increases cold-start time and creates substantial shared
memory/CPU pressure. If readiness repeatedly exceeds the timeout, use a larger
instance or restore the separate-service deployment.
