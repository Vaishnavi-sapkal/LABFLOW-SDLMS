import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DashboardModule } from './dashboard.module';

async function bootstrap() {
  const app = await NestFactory.create(DashboardModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const config = new DocumentBuilder()
    .setTitle('LabFlow Dashboard Service')
    .setDescription('Dashboard aggregation APIs')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const bindHost = process.env.BIND_HOST;
  await (bindHost ? app.listen(process.env.PORT || 3011, bindHost) : app.listen(process.env.PORT || 3011));
}

bootstrap();
