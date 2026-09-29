#!/bin/sh
set -eu

: "${PORT:=10000}"
export PORT

echo "Starting LabFlow backend services..."

# ============================================================
# AUTH SERVICE - Port 3001
# ============================================================
PORT=3001 MONGODB_URI="$AUTH_MONGODB_URI" \
node /app/backend/services/auth-service/dist/main.js &

# ============================================================
# PATIENT SERVICE - Port 3002
# ============================================================
PORT=3002 MONGODB_URI="$PATIENT_MONGODB_URI" \
node /app/backend/services/patient-service/dist/src/main.js &

# ============================================================
# DOCTOR SERVICE - Port 3003
# ============================================================
PORT=3003 MONGODB_URI="$DOCTOR_MONGODB_URI" \
node /app/backend/services/doctor-service/dist/main.js &

# ============================================================
# TEST SERVICE - Port 3004
# ============================================================
PORT=3004 MONGODB_URI="$TEST_MONGODB_URI" \
node /app/backend/services/test-service/dist/main.js &

# ============================================================
# BOOKING SERVICE - Port 3005
# ============================================================
PORT=3005 MONGODB_URI="$BOOKING_MONGODB_URI" \
node /app/backend/services/booking-service/dist/main.js &

# ============================================================
# SAMPLE SERVICE - Port 3006
# ============================================================
PORT=3006 MONGODB_URI="$SAMPLE_MONGODB_URI" \
node /app/backend/services/sample-service/dist/main.js &

# ============================================================
# RESULT SERVICE - Port 3007
# ============================================================
PORT=3007 MONGODB_URI="$RESULT_MONGODB_URI" \
node /app/backend/services/result-service/dist/main.js &

# ============================================================
# VERIFICATION SERVICE - Port 3008
# ============================================================
PORT=3008 MONGODB_URI="$VERIFICATION_MONGODB_URI" \
node /app/backend/services/verification-service/dist/main.js &

# ============================================================
# BILLING SERVICE - Port 3009
# ============================================================
PORT=3009 MONGODB_URI="$BILLING_MONGODB_URI" \
node /app/backend/services/billing-service/dist/main.js &

# ============================================================
# NOTIFICATION SERVICE - Port 3010
# ============================================================
PORT=3010 MONGODB_URI="$NOTIFICATION_MONGODB_URI" \
node /app/backend/services/notification-service/dist/main.js &

# ============================================================
# REPORT SERVICE - Port 3011
# ============================================================
PORT=3011 MONGODB_URI="$REPORT_MONGODB_URI" \
node /app/backend/services/report-service/dist/main.js &

# ============================================================
# DASHBOARD SERVICE - Port 3012
# ============================================================
PORT=3012 MONGODB_URI="$DASHBOARD_MONGODB_URI" \
node /app/backend/services/dashboard-service/dist/main.js &

echo "All backend services started."

# ============================================================
# WAIT FOR AUTH SERVICE
# ============================================================
echo "Waiting for Auth Service on port 3001..."

until wget -qO- http://127.0.0.1:3001/health >/dev/null 2>&1; do
    sleep 1
done

echo "Auth Service is ready."

# ============================================================
# API GATEWAY - Port 10000
# ============================================================
echo "Starting API Gateway on port ${PORT}..."

exec node /app/backend/api-gateway/dist/main.js