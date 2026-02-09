import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatModule } from "./chat/chat.module";
import { ImageProcessingModule } from "./image-processing/image-processing.module";
import { LanguageLearningModule } from "./language-learning/language-learning.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env",
        }),
        ChatModule,
        ImageProcessingModule,
        LanguageLearningModule,
    ],
})
export class AppModule {}
