import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded } from "express";

async function bootstrap() {
    const logger = new Logger("Bootstrap");
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: false,
    });

    // Enable CORS
    app.enableCors();

    // Increase body size limit for image uploads (base64 payloads)
    app.use(json({ limit: "50mb" }));
    app.use(urlencoded({ limit: "50mb", extended: true }));

    // Swagger documentation setup
    const config = new DocumentBuilder()
        .setTitle("AI Tools API")
        .setDescription("AI Tools API")
        .setVersion("1.0")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("swagger", app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 NestJS Server running on http://localhost:${port}`);
}
bootstrap();
