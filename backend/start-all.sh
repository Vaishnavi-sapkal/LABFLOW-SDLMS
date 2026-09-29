#!/bin/sh
set -eu

: "${PORT:=10000}"
export PORT

echo "Starting LabFlow backend services..."

PORT=3001 MONGODB_URI="$AUTH_MONGODB_URI" \
node /app/backend/services/auth-service/dist/main.js &

PORT=3002 MONGODB_URI="$PATIENT_MONGODB_URI" \
node /app/backend/services/patient-service/dist/src/main.js &

PORT=3003 MONGODB_URI="$DOCTOR_MONGODB_URI" \
node /app/backend/services/doctor-service/dist/main.js &

PORT=3004 MONGODB_URI="$TEST_MONGODB_URI" \
node /app/backend/services/test-service/dist/main.js &

PORT=3005 MONGODB_URI="$BOOKING_MONGODB_URI" \
node /app/backend/services/booking-service/dist/main.js &

PORT=3006 MONGODB_URI="$SAMPLE_MONGODB_URI" \
node /app/backend/services/sample-service/dist/main.js &

PORT=3007 MONGODB_URI="$RESULT_MONGODB_URI" \
node /app/backend/services/result-service/dist/main.js &

PORT=3008 MONGODB_URI="$VERIFICATION_MONGODB_URI" \
node /app/backend/services/verification-service/dist/main.js &

PORT=3009 MONGODB_URI="$BILLING_MONGODB_URI" \
node /app/backend/services/billing-service/dist/main.js &

PORT=3010 MONGODB_URI="$NOTIFICATION_MONGODB_URI" \
node /app/backend/services/notification-service/dist/main.js &

PORT=3011 MONGODB_URI="$REPORT_MONGODB_URI" \
node /app/backend/services/report-service/dist/main.js &

PORT=3012 MONGODB_URI="$DASHBOARD_MONGODB_URI" \
node /app/backend/services/dashboard-service/dist/main.js &

echo "All backend services started."
echo "Starting API Gateway on port ${PORT}..."

exec node /app/backend/api-gateway/dist/main.js
