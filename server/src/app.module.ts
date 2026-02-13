import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatModule } from "./chat/chat.module";
import { ImageProcessingModule } from "./image-processing/image-processing.module";
import { LanguageLearningModule } from "./language-learning/language-learning.module";
import { TextRecognitionModule } from "./text-recognition/text-recognition.module";
import { LlmProviderModule } from "./shared/llm-provider/llm-provider.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env",
        }),
        LlmProviderModule,
        ChatModule,
        ImageProcessingModule,
        LanguageLearningModule,
        TextRecognitionModule,
    ],
})
export class AppModule {}
