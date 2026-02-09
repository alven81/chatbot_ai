import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ImageProcessingController } from "./image-processing.controller";
import { ImageProcessingService } from "./image-processing.service";

@Module({
    imports: [ConfigModule],
    controllers: [ImageProcessingController],
    providers: [ImageProcessingService],
})
export class ImageProcessingModule {}
