const fs = require('node:fs');

const supervisor = fs.readFileSync('deploy/combined-supervisor.js', 'utf8');
const dockerfile = fs.readFileSync('Dockerfile.combined', 'utf8');
const blueprint = fs.readFileSync('render.combined.yaml', 'utf8');
const expectedServices = ['auth', 'patient', 'test', 'booking', 'doctor', 'sample', 'result', 'verification', 'billing', 'notification', 'report', 'dashboard'];
const requiredUrls = ['AUTH', 'PATIENT', 'TEST', 'BOOKING', 'DOCTOR', 'SAMPLE', 'RESULT', 'VERIFICATION', 'BILLING', 'NOTIFICATION', 'REPORT', 'DASHBOARD'];
const requiredBlueprintVariables = ['MONGODB_URI', 'JWT_SECRET', 'INTERNAL_SERVICE_SECRET', 'FRONTEND_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_SECURE', 'UPI_ID', 'UPI_PAYEE_NAME'];

for (const service of expectedServices) {
  if (!supervisor.includes(`name: '${service}-service'`)) throw new Error(`Missing ${service}-service from supervisor`);
}
if (!supervisor.includes("patient-service/dist/src/main.js")) throw new Error('Patient service must use its emitted dist/src/main.js entry point');
if (!supervisor.includes("result-service/dist/main.js")) throw new Error('Result service must use its emitted dist/main.js entry point');
const ports = [...supervisor.matchAll(/port: (\d+)/g)].map((match) => Number(match[1]));
if (ports.length !== 12 || new Set(ports).size !== 12) throw new Error('Internal service ports must be unique and include all 12 services');
for (const name of requiredUrls) {
  if (!supervisor.includes(`${name}_SERVICE_URL`)) throw new Error(`Missing ${name}_SERVICE_URL`);
}
if (supervisor.includes('.onrender.com')) throw new Error('Combined supervisor must not use public Render service URLs');
if (!supervisor.includes('BIND_HOST: LOOPBACK')) throw new Error('Internal services must be bound to loopback in the combined container');
if (!dockerfile.includes('@labflow/dashboard-service') || !dockerfile.includes('@labflow/api-gateway')) throw new Error('Combined Dockerfile must build gateway and all services');
if (!blueprint.includes('Dockerfile.combined') || blueprint.includes('labflow-auth-service')) throw new Error('Combined Blueprint must declare only the combined service');
for (const variable of requiredBlueprintVariables) {
  if (!blueprint.includes(`key: ${variable}`)) throw new Error(`Combined Blueprint is missing ${variable}`);
}
console.log('Combined container configuration validation passed.');
