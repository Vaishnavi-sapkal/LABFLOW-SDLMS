import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const config = new DocumentBuilder().setTitle('LabFlow Notification Service').setDescription('In-app role-based notification APIs').setVersion('1.0').build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  const bindHost = process.env.BIND_HOST;
  await (bindHost ? app.listen(process.env.PORT ?? 3000, bindHost) : app.listen(process.env.PORT ?? 3000));
}

void bootstrap();
