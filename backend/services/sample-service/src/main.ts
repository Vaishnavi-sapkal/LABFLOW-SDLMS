import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dns from 'node:dns';

import { SampleModule } from './sample.module';

async function bootstrap() {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);

    const app = await NestFactory.create(SampleModule);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    const config = new DocumentBuilder()
      .setTitle('LabFlow Sample Service')
      .setDescription('Laboratory sample tracking APIs')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api', app, document);

    const bindHost = process.env.BIND_HOST;
    await (bindHost ? app.listen(process.env.PORT ?? 3000, bindHost) : app.listen(process.env.PORT ?? 3000));

    console.log(
      `Sample Service running on http://localhost:${process.env.PORT ?? 3000}`,
    );
    console.log(
      `Swagger: http://localhost:${process.env.PORT ?? 3000}/api`,
    );
  } catch (error) {
    console.error('Sample Service failed to start:', error);
    process.exit(1);
  }
}

void bootstrap();
