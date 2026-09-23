import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { PatientModule } from './patient.module';

async function dropLegacyMobileUniqueIndex(connection: Connection) {
  const collection = connection.collection('patients');
  let indexes;
  try {
    indexes = await collection.indexes();
  } catch (error: any) {
    if (error?.codeName === 'NamespaceNotFound') {
      console.log('Patients collection does not exist yet; no mobile index cleanup needed.');
      return;
    }
    throw error;
  }
  const mobileUniqueIndex = indexes.find((index) =>
    index.unique === true &&
    index.key &&
    Object.keys(index.key).length === 1 &&
    index.key.mobile === 1,
  );

  if (!mobileUniqueIndex?.name) {
    console.log('No unique mobile index found on patients collection.');
    return;
  }

  await collection.dropIndex(mobileUniqueIndex.name);
  console.log(`Dropped legacy unique mobile index on patients collection: ${mobileUniqueIndex.name}`);
}

async function bootstrap() {
  const app = await NestFactory.create(PatientModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await dropLegacyMobileUniqueIndex(app.get<Connection>(getConnectionToken()));

  const config = new DocumentBuilder()
    .setTitle('LabFlow Patient Service')
    .setDescription('Patient profile management APIs')
    .setVersion('1.0')
    .build();

  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
