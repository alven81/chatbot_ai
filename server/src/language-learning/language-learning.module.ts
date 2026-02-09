import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LanguageLearningController } from "./language-learning.controller";
import { LanguageLearningService } from "./language-learning.service";

@Module({
    imports: [ConfigModule],
    controllers: [LanguageLearningController],
    providers: [LanguageLearningService],
})
export class LanguageLearningModule {}
