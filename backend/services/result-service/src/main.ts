import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dns from 'node:dns';

import { ResultModule } from './result.module';

async function bootstrap() {
  // DNS servers for MongoDB Atlas SRV resolution
  dns.setServers(['8.8.8.8', '1.1.1.1']);

  const app = await NestFactory.create(ResultModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('LabFlow Result Service')
    .setDescription('Laboratory result entry and verification APIs')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;

  const bindHost = process.env.BIND_HOST;
  await (bindHost ? app.listen(port, bindHost) : app.listen(port));

  console.log(`Result Service running on port ${port}`);
  console.log(`Swagger: http://localhost:${port}/api`);
}

void bootstrap();
