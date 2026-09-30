import * as dns from 'dns';

dns.setServers([
  '8.8.8.8',
  '8.8.4.4',
]);

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('LabFlow Auth Service')
    .setDescription('Authentication and Authorization APIs')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;

  const bindHost = process.env.BIND_HOST;
  await (bindHost ? app.listen(port, bindHost) : app.listen(port));

  console.log(`Auth Service running on port ${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
}

bootstrap();
