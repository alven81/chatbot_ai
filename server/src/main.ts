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

    // Set global prefix
    app.setGlobalPrefix("api");

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
    await app.listen(port, "0.0.0.0");

    logger.log(`🚀 NestJS Server running on http://127.0.0.1:${port}`);

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
        logger.log(`${signal} received, closing server gracefully...`);
        try {
            await app.close();
            logger.log("Server closed successfully");
            process.exit(0);
        } catch (error) {
            logger.error("Error during shutdown:", error);
            process.exit(1);
        }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
    console.error("Bootstrap error:", err);
    process.exit(1);
});
