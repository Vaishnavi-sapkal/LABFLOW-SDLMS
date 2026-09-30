import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VerificationModule } from './verification.module';

async function bootstrap() {
  const app = await NestFactory.create(VerificationModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('LabFlow Verification Service')
    .setDescription('Laboratory result verification APIs')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  const bindHost = process.env.BIND_HOST;
  await (bindHost ? app.listen(port, bindHost) : app.listen(port));
}

void bootstrap();
