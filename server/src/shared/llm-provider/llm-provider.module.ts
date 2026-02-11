import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LlmProviderService } from "./llm-provider.service";

@Global()
@Module({
    imports: [ConfigModule],
    providers: [LlmProviderService],
    exports: [LlmProviderService],
})
export class LlmProviderModule {}
