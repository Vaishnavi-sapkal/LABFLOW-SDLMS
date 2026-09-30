import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TestModule } from './test.module';

async function bootstrap() {
  const app = await NestFactory.create(TestModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('LabFlow Test Service')
    .setDescription('Laboratory test and package catalog APIs')
    .setVersion('1.0')
    .build();

  SwaggerModule.setup(
    'api',
    app,
    SwaggerModule.createDocument(app, config),
  );

  const bindHost = process.env.BIND_HOST;
  await (bindHost ? app.listen(process.env.PORT ?? 3002, bindHost) : app.listen(process.env.PORT ?? 3002));
}

void bootstrap();
