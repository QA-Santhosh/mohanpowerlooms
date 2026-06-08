import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend connection
  app.enableCors();
  
  // Set global API prefix
  app.setGlobalPrefix('api');
  
  // Enable global validation rules
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Backend server successfully running on: http://localhost:${port}/api`);
}
bootstrap();
