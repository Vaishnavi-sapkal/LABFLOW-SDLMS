FROM node:20-alpine AS build

ARG SERVICE_PATH

WORKDIR /app

# npm workspaces resolve from the repository root, so every workspace manifest
# must be available when installing dependencies.
COPY . .
RUN npm ci
RUN case "$SERVICE_PATH" in \
      backend/api-gateway) WORKSPACE="@labflow/api-gateway" ;; \
      backend/services/auth-service) WORKSPACE="@labflow/auth-service" ;; \
      backend/services/billing-service) WORKSPACE="@labflow/billing-service" ;; \
      backend/services/booking-service) WORKSPACE="@labflow/booking-service" ;; \
      backend/services/dashboard-service) WORKSPACE="@labflow/dashboard-service" ;; \
      backend/services/doctor-service) WORKSPACE="@labflow/doctor-service" ;; \
      backend/services/notification-service) WORKSPACE="@labflow/notification-service" ;; \
      backend/services/patient-service) WORKSPACE="@labflow/patient-service" ;; \
      backend/services/report-service) WORKSPACE="@labflow/report-service" ;; \
      backend/services/result-service) WORKSPACE="@labflow/result-service" ;; \
      backend/services/sample-service) WORKSPACE="@labflow/sample-service" ;; \
      backend/services/test-service) WORKSPACE="@labflow/test-service" ;; \
      backend/services/verification-service) WORKSPACE="@labflow/verification-service" ;; \
      *) echo "Unsupported SERVICE_PATH: $SERVICE_PATH" >&2; exit 1 ;; \
    esac && npm run build --workspace="$WORKSPACE"
    
FROM node:20-alpine AS runtime

ARG SERVICE_PATH

WORKDIR /app/${SERVICE_PATH}

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/${SERVICE_PATH}/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/main.js"]