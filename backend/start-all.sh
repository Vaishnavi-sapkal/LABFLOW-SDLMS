#!/bin/sh
set -eu

: "${PORT:=10000}"
export PORT

echo "============================================================"
echo "Starting LabFlow backend services..."
echo "============================================================"

echo "Starting Auth Service on port 3001..."
PORT=3001 MONGODB_URI="$AUTH_MONGODB_URI" node /app/backend/services/auth-service/dist/main.js &

echo "Starting Patient Service on port 3002..."
PORT=3002 MONGODB_URI="$PATIENT_MONGODB_URI" node /app/backend/services/patient-service/dist/src/main.js &

echo "Starting Doctor Service on port 3003..."
PORT=3003 MONGODB_URI="$DOCTOR_MONGODB_URI" node /app/backend/services/doctor-service/dist/main.js &

echo "Starting Test Service on port 3004..."
PORT=3004 MONGODB_URI="$TEST_MONGODB_URI" node /app/backend/services/test-service/dist/main.js &

echo "Starting Booking Service on port 3005..."
PORT=3005 MONGODB_URI="$BOOKING_MONGODB_URI" node /app/backend/services/booking-service/dist/main.js &

echo "Starting Sample Service on port 3006..."
PORT=3006 MONGODB_URI="$SAMPLE_MONGODB_URI" node /app/backend/services/sample-service/dist/main.js &

echo "Starting Result Service on port 3007..."
PORT=3007 MONGODB_URI="$RESULT_MONGODB_URI" node /app/backend/services/result-service/dist/main.js &

echo "Starting Verification Service on port 3008..."
PORT=3008 MONGODB_URI="$VERIFICATION_MONGODB_URI" node /app/backend/services/verification-service/dist/main.js &

echo "Starting Billing Service on port 3009..."
PORT=3009 MONGODB_URI="$BILLING_MONGODB_URI" node /app/backend/services/billing-service/dist/main.js &

echo "Starting Notification Service on port 3010..."
PORT=3010 MONGODB_URI="$NOTIFICATION_MONGODB_URI" node /app/backend/services/notification-service/dist/main.js &

echo "Starting Report Service on port 3011..."
PORT=3011 MONGODB_URI="$REPORT_MONGODB_URI" node /app/backend/services/report-service/dist/main.js &

echo "Starting Dashboard Service on port 3012..."
PORT=3012 MONGODB_URI="$DASHBOARD_MONGODB_URI" node /app/backend/services/dashboard-service/dist/main.js &

echo "============================================================"
echo "All backend services started."
echo "============================================================"

echo "Waiting for Auth Service on port 3001..."

AUTH_READY=0

for i in $(seq 1 120); do
    if wget -qO- http://127.0.0.1:3001/health >/dev/null 2>&1; then
        AUTH_READY=1
        break
    fi

    echo "Auth Service not ready yet... ${i}/120"
    sleep 1
done

if [ "$AUTH_READY" -ne 1 ]; then
    echo "============================================================"
    echo "ERROR: Auth Service failed to become ready."
    echo "Auth Service did not respond within 120 seconds."
    echo "Stopping LabFlow container."
    echo "============================================================"
    exit 1
fi

echo "============================================================"
echo "Auth Service is ready."
echo "============================================================"

echo "Starting API Gateway on port ${PORT}..."

exec node /app/backend/api-gateway/dist/main.js
