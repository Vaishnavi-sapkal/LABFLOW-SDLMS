import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';

@Module({})
class GatewayModule {}

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  app.enableCors({
    // Restrict this to an explicit origin allowlist in production.
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.getHttpAdapter().get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'api-gateway' });
  });

  // Services are not publicly exposed in the deployment topology. Validate every
  // non-public request at the gateway against auth-service so a deleted/disabled
  // user cannot continue using an otherwise valid JWT until it expires.
  const authServiceUrl = (process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  app.use('/api', async (request: any, response: any, next: () => void) => {
    const path = request.path as string;
    const isPublic = request.method === 'OPTIONS' || (request.method === 'POST' && (path === '/auth/login' || path === '/auth/register' || path === '/auth/forgot-password' || path === '/auth/reset-password' || path === '/auth/patient-signup' || path === '/auth/verify-email' || path === '/auth/resend-verification')) ||
      path === '/auth/protected' || path.startsWith('/reports/verify/');
    if (isPublic) return next();

    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      return response.status(401).json({ message: 'Authentication is required' });
    }

    try {
      const session = await fetch(`${authServiceUrl}/auth/protected`, { headers: { authorization } });
      if (!session.ok) return response.status(401).json({ message: 'Your session is no longer active. Please sign in again.' });
      return next();
    } catch {
      return response.status(503).json({ message: 'Authentication service is unavailable' });
    }
  });

  const services = [
    { prefix: '/api/auth', target: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001' },
    { prefix: '/api/patients', target: process.env.PATIENT_SERVICE_URL ?? 'http://localhost:3002' },
    { prefix: '/api/tests', target: process.env.TEST_SERVICE_URL ?? 'http://localhost:3003' },
    { prefix: '/api/bookings', target: process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3004' },
    { prefix: '/api/doctors', target: process.env.DOCTOR_SERVICE_URL ?? 'http://localhost:3005' },
    { prefix: '/api/samples', target: process.env.SAMPLE_SERVICE_URL ?? 'http://localhost:3006' },
    { prefix: '/api/results', target: process.env.RESULT_SERVICE_URL ?? 'http://localhost:3007' },
    { prefix: '/api/verifications', target: process.env.VERIFICATION_SERVICE_URL ?? 'http://localhost:3008' },
    { prefix: '/api/billing', target: process.env.BILLING_SERVICE_URL ?? 'http://localhost:3009' },
    { prefix: '/api/notifications', target: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3010' },
    { prefix: '/api/reports', target: process.env.REPORT_SERVICE_URL ?? 'http://localhost:3011' },
    { prefix: '/api/dashboard', target: process.env.DASHBOARD_SERVICE_URL ?? 'http://localhost:3012' },
  ];

  for (const { prefix, target } of services) {
    app.use(
      prefix,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (_path, request) => request.originalUrl.replace(/^\/api/, ''),
        onError: (_error, _request, response) => {
          if (!response.headersSent) {
            response.status(502).json({ error: 'Service unavailable' });
          }
        },
      }),
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
