import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle("AI ChatBot API")
    .setDescription("AI ChatBot API")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("swagger", app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 NestJS Server running on http://localhost:${port}`);
}
bootstrap();
