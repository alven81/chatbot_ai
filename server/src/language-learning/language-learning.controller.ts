import {
    Controller,
    Post,
    Get,
    Body,
    Res,
    HttpStatus,
    Inject,
    Logger,
} from "@nestjs/common";
import { LanguageLearningService } from "./language-learning.service";
import type { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import {
    LanguageLearningRequest,
    LanguageLearningClearRequest,
} from "./dto/language-learning.dto";

@ApiTags("Language Learning")
@Controller("language-learning")
export class LanguageLearningController {
    private readonly logger = new Logger(LanguageLearningController.name);
    constructor(
        @Inject(LanguageLearningService)
        private readonly languageLearningService: LanguageLearningService
    ) {}

    @Post("stream")
    @ApiOperation({
        summary: "Send a message and get a streaming language-tutor response",
    })
    @ApiBody({ type: LanguageLearningRequest })
    @ApiResponse({
        status: 200,
        description:
            "The AI tutor response stream (SSE) including translation & corrections",
    })
    async streamChat(
        @Body() body: LanguageLearningRequest,
        @Res() res: Response
    ) {
        this.logger.log(
            `Starting stream for: ${body.message} (Lang: ${body.learningLanguage}, Session: ${body.sessionId})`
        );
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.status(HttpStatus.OK);

        const stream$ = this.languageLearningService.streamResponse(
            body.message,
            body.sessionId,
            body.learningLanguage,
            body.userLanguage,
            body.learningLevel,
            body.userProfession,
            body.modelId
        );

        const subscription = stream$.subscribe({
            next: (val) => {
                res.write(`data: ${JSON.stringify(val.data)}\n\n`);
            },
            error: (err) => {
                this.logger.error(
                    `Stream error for session ${body.sessionId}: ${err.message}`
                );
                res.write(
                    `data: ${JSON.stringify({ error: err.message })}\n\n`
                );
                res.end();
            },
            complete: () => {
                this.logger.log(
                    `Stream complete for session ${body.sessionId}`
                );
                res.end();
            },
        });

        res.on("close", () => {
            this.logger.log(
                `Client closed connection for session ${body.sessionId}`
            );
            subscription.unsubscribe();
        });
    }

    @Post("clear")
    @ApiOperation({ summary: "Clear language-learning chat history" })
    @ApiBody({ type: LanguageLearningClearRequest })
    @ApiResponse({ status: 200, description: "History cleared successfully" })
    clearChat(@Body() body: LanguageLearningClearRequest) {
        return this.languageLearningService.clearHistory(body.sessionId);
    }

    @Get("health")
    @ApiOperation({ summary: "Get API health and active LLM provider" })
    @ApiResponse({ status: 200, description: "Health status" })
    health() {
        return this.languageLearningService.getHealth();
    }
}
