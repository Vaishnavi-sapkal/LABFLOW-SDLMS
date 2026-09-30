import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ReportModule } from './report.module';

async function bootstrap() {
  const app = await NestFactory.create(ReportModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const config = new DocumentBuilder().setTitle('LabFlow Report Service').setDescription('Laboratory report generation APIs').setVersion('1.0').build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  const bindHost = process.env.BIND_HOST;
  await (bindHost ? app.listen(process.env.PORT ?? 3000, bindHost) : app.listen(process.env.PORT ?? 3000));
}

void bootstrap();
