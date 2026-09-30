'use strict';

const { spawn } = require('node:child_process');

const LOOPBACK = '127.0.0.1';
const READY_TIMEOUT_MS = Number(process.env.SERVICE_READY_TIMEOUT_MS || 90_000);
const READY_INTERVAL_MS = 1_000;

const services = [
  { name: 'auth-service', port: 3001, entry: 'backend/services/auth-service/dist/main.js', health: '/health', database: 'labflow-auth' },
  { name: 'patient-service', port: 3002, entry: 'backend/services/patient-service/dist/src/main.js', health: '/health', database: 'labflow-patient' },
  { name: 'test-service', port: 3003, entry: 'backend/services/test-service/dist/main.js', health: '/health', database: 'labflow-test' },
  { name: 'booking-service', port: 3004, entry: 'backend/services/booking-service/dist/main.js', health: '/health', database: 'labflow-booking' },
  { name: 'doctor-service', port: 3005, entry: 'backend/services/doctor-service/dist/main.js', health: '/health', database: 'labflow-doctor' },
  { name: 'sample-service', port: 3006, entry: 'backend/services/sample-service/dist/main.js', health: '/health', database: 'labflow-sample' },
  { name: 'result-service', port: 3007, entry: 'backend/services/result-service/dist/main.js', health: '/results/health', database: 'labflow-result' },
  { name: 'verification-service', port: 3008, entry: 'backend/services/verification-service/dist/main.js', health: '/health', database: 'labflow-verification' },
  { name: 'billing-service', port: 3009, entry: 'backend/services/billing-service/dist/main.js', health: '/health', database: 'labflow-billing' },
  { name: 'notification-service', port: 3010, entry: 'backend/services/notification-service/dist/main.js', health: '/notifications/health', database: 'labflow-notification' },
  { name: 'report-service', port: 3011, entry: 'backend/services/report-service/dist/main.js', health: '/health', database: 'labflow-report' },
  { name: 'dashboard-service', port: 3012, entry: 'backend/services/dashboard-service/dist/main.js', health: '/dashboard/health' },
];

const childProcesses = new Map();
let stopping = false;

function internalUrls() {
  const byName = Object.fromEntries(services.map((service) => [service.name, `http://${LOOPBACK}:${service.port}`]));
  return {
    AUTH_SERVICE_URL: byName['auth-service'],
    PATIENT_SERVICE_URL: byName['patient-service'],
    TEST_SERVICE_URL: byName['test-service'],
    BOOKING_SERVICE_URL: byName['booking-service'],
    DOCTOR_SERVICE_URL: byName['doctor-service'],
    SAMPLE_SERVICE_URL: byName['sample-service'],
    RESULT_SERVICE_URL: byName['result-service'],
    VERIFICATION_SERVICE_URL: byName['verification-service'],
    BILLING_SERVICE_URL: byName['billing-service'],
    NOTIFICATION_SERVICE_URL: byName['notification-service'],
    REPORT_SERVICE_URL: byName['report-service'],
    DASHBOARD_SERVICE_URL: byName['dashboard-service'],
  };
}

function databaseUri(service) {
  const override = process.env[`${service.name.replace(/-/g, '_').toUpperCase()}_MONGODB_URI`];
  if (override) return override;
  const base = process.env.MONGODB_URI;
  if (!base) throw new Error(`Set MONGODB_URI or ${service.name.replace(/-/g, '_').toUpperCase()}_MONGODB_URI for ${service.name}`);
  try {
    const url = new URL(base);
    url.pathname = `/${service.database}`;
    return url.toString();
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB connection URI');
  }
}

function startService(service) {
  const environment = { ...process.env, ...internalUrls(), PORT: String(service.port), BIND_HOST: LOOPBACK };
  if (service.database) environment.MONGODB_URI = databaseUri(service);
  else delete environment.MONGODB_URI;
  const child = spawn(process.execPath, [service.entry], {
    cwd: process.cwd(),
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  childProcesses.set(service.name, child);
  child.stdout.on('data', (data) => process.stdout.write(`[${service.name}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${service.name}] ${data}`));
  child.on('error', (error) => fail(`${service.name} could not start: ${error.message}`));
  child.on('exit', (code, signal) => {
    childProcesses.delete(service.name);
    if (!stopping) fail(`${service.name} exited unexpectedly (${signal || `code ${code}`})`);
  });
}

async function isReady(service) {
  try {
    const response = await fetch(`http://${LOOPBACK}:${service.port}${service.health}`, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServices() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  const pending = new Set(services.map((service) => service.name));
  while (pending.size && Date.now() < deadline) {
    await Promise.all(services.filter((service) => pending.has(service.name)).map(async (service) => {
      if (await isReady(service)) {
        pending.delete(service.name);
        console.log(`[supervisor] ${service.name} is ready`);
      }
    }));
    if (pending.size) await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS));
  }
  if (pending.size) throw new Error(`Timed out waiting for: ${[...pending].join(', ')}`);
}

function startGateway() {
  const gateway = { name: 'api-gateway', entry: 'backend/api-gateway/dist/main.js' };
  const child = spawn(process.execPath, [gateway.entry], {
    cwd: process.cwd(),
    env: { ...process.env, ...internalUrls(), PORT: process.env.PORT || '10000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  childProcesses.set(gateway.name, child);
  child.stdout.on('data', (data) => process.stdout.write(`[${gateway.name}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${gateway.name}] ${data}`));
  child.on('error', (error) => fail(`${gateway.name} could not start: ${error.message}`));
  child.on('exit', (code, signal) => {
    childProcesses.delete(gateway.name);
    if (!stopping) fail(`${gateway.name} exited unexpectedly (${signal || `code ${code}`})`);
  });
}

function shutdown(exitCode) {
  if (stopping) return;
  stopping = true;
  console.log('[supervisor] stopping child processes');
  for (const child of childProcesses.values()) child.kill('SIGTERM');
  const timeout = setTimeout(() => {
    for (const child of childProcesses.values()) child.kill('SIGKILL');
    process.exit(exitCode);
  }, 10_000);
  timeout.unref();
  if (!childProcesses.size) process.exit(exitCode);
  let remaining = childProcesses.size;
  for (const child of childProcesses.values()) child.once('exit', () => {
    remaining -= 1;
    if (remaining === 0) process.exit(exitCode);
  });
}

function fail(message) {
  console.error(`[supervisor] ${message}`);
  shutdown(1);
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

(async () => {
  try {
    for (const service of services) startService(service);
    await waitForServices();
    startGateway();
    console.log('[supervisor] all services are ready; api-gateway started');
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
})();
