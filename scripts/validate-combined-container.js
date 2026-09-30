const fs = require('node:fs');

const supervisor = fs.readFileSync('deploy/combined-supervisor.js', 'utf8');
const dockerfile = fs.readFileSync('Dockerfile.combined', 'utf8');
const blueprint = fs.readFileSync('render.combined.yaml', 'utf8');
const gateway = fs.readFileSync('backend/api-gateway/src/main.ts', 'utf8');
const expectedServices = ['auth', 'patient', 'test', 'booking', 'doctor', 'sample', 'result', 'verification', 'billing', 'notification', 'report', 'dashboard'];
const requiredUrls = ['AUTH', 'PATIENT', 'TEST', 'BOOKING', 'DOCTOR', 'SAMPLE', 'RESULT', 'VERIFICATION', 'BILLING', 'NOTIFICATION', 'REPORT', 'DASHBOARD'];
const requiredBlueprintVariables = ['MONGODB_URI', 'JWT_SECRET', 'INTERNAL_SERVICE_SECRET', 'FRONTEND_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_SECURE', 'UPI_ID', 'UPI_PAYEE_NAME'];
const expectedHealthPaths = {
  'auth-service': '/health',
  'patient-service': '/health',
  'test-service': '/health',
  'booking-service': '/health',
  'doctor-service': '/health',
  'sample-service': '/health',
  'result-service': '/results/health',
  'verification-service': '/health',
  'billing-service': '/health',
  'notification-service': '/notifications/health',
  'report-service': '/health',
  'dashboard-service': '/dashboard/health',
};
const serviceSources = {
  'auth-service': ['backend/services/auth-service/src/auth.controller.ts', ''],
  'patient-service': ['backend/services/patient-service/src/patient.controller.ts', ''],
  'test-service': ['backend/services/test-service/src/test.controller.ts', ''],
  'booking-service': ['backend/services/booking-service/src/booking.controller.ts', ''],
  'doctor-service': ['backend/services/doctor-service/src/doctor.controller.ts', ''],
  'sample-service': ['backend/services/sample-service/src/sample.controller.ts', ''],
  'result-service': ['backend/services/result-service/src/result.controller.ts', "@Controller('results')"],
  'verification-service': ['backend/services/verification-service/src/verification.controller.ts', ''],
  'billing-service': ['backend/services/billing-service/src/billing.controller.ts', ''],
  'notification-service': ['backend/services/notification-service/src/notification.controller.ts', "@Controller('notifications')"],
  'report-service': ['backend/services/report-service/src/report.controller.ts', ''],
  'dashboard-service': ['backend/services/dashboard-service/src/dashboard.controller.ts', "@Controller('dashboard')"],
};

for (const service of expectedServices) {
  if (!supervisor.includes(`name: '${service}-service'`)) throw new Error(`Missing ${service}-service from supervisor`);
}
if (!supervisor.includes("patient-service/dist/src/main.js")) throw new Error('Patient service must use its emitted dist/src/main.js entry point');
if (!supervisor.includes("result-service/dist/main.js")) throw new Error('Result service must use its emitted dist/main.js entry point');
for (const [service, health] of Object.entries(expectedHealthPaths)) {
  if (!supervisor.includes(`name: '${service}'`) || !supervisor.includes(`health: '${health}'`)) {
    throw new Error(`Missing verified ${health} health endpoint for ${service}`);
  }
  const [controllerPath, controllerPrefix] = serviceSources[service];
  const controller = fs.readFileSync(controllerPath, 'utf8');
  if (!controller.includes("@Get('health')") || (controllerPrefix && !controller.includes(controllerPrefix))) {
    throw new Error(`Source health controller does not match ${service}`);
  }
  const main = fs.readFileSync(controllerPath.replace(/[^/]+\.controller\.ts$/, 'main.ts'), 'utf8');
  if (!main.includes('const bindHost = process.env.BIND_HOST') || !main.includes('bindHost ? app.listen')) {
    throw new Error(`${service} must honor the internal BIND_HOST setting`);
  }
}
const ports = [...supervisor.matchAll(/port: (\d+)/g)].map((match) => Number(match[1]));
if (ports.length !== 12 || new Set(ports).size !== 12) throw new Error('Internal service ports must be unique and include all 12 services');
for (const name of requiredUrls) {
  if (!supervisor.includes(`${name}_SERVICE_URL`)) throw new Error(`Missing ${name}_SERVICE_URL`);
}
if (supervisor.includes('.onrender.com')) throw new Error('Combined supervisor must not use public Render service URLs');
if (!supervisor.includes('BIND_HOST: LOOPBACK')) throw new Error('Internal services must be bound to loopback in the combined container');
if (!supervisor.includes('300_000')) throw new Error('Supervisor must allow a bounded multi-minute service startup window');
const startup = supervisor.slice(supervisor.lastIndexOf('(async () =>'));
if (startup.indexOf('startGateway();') === -1 || startup.indexOf('for (const service of services) startService(service);') === -1 || startup.indexOf('startGateway();') > startup.indexOf('for (const service of services) startService(service);')) {
  throw new Error('Gateway must start before the internal service readiness wait');
}
if (!gateway.includes("app.listen(process.env.PORT ?? 3000, '0.0.0.0')")) throw new Error('Gateway must bind Render PORT on 0.0.0.0');
if (!gateway.includes("get('/ready'")) throw new Error('Gateway must expose dependency-aware /ready');
if (!dockerfile.includes('@labflow/dashboard-service') || !dockerfile.includes('@labflow/api-gateway')) throw new Error('Combined Dockerfile must build gateway and all services');
if (!blueprint.includes('Dockerfile.combined') || blueprint.includes('labflow-auth-service')) throw new Error('Combined Blueprint must declare only the combined service');
for (const variable of requiredBlueprintVariables) {
  if (!blueprint.includes(`key: ${variable}`)) throw new Error(`Combined Blueprint is missing ${variable}`);
}
console.log('Combined container configuration validation passed.');
