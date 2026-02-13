import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TextRecognitionController } from "./text-recognition.controller";
import { TextRecognitionService } from "./text-recognition.service";

@Module({
    imports: [ConfigModule],
    controllers: [TextRecognitionController],
    providers: [TextRecognitionService],
})
export class TextRecognitionModule {}
