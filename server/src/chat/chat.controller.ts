import {
    Controller,
    Post,
    Body,
    Get,
    Res,
    HttpStatus,
    Inject,
    Logger,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import type { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ChatRequest, ClearRequest } from "./dto/chat.dto";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
    private readonly logger = new Logger(ChatController.name);
    constructor(
        @Inject(ChatService) private readonly chatService: ChatService
    ) {}

    @Post("history")
    @ApiOperation({ summary: "Send a message and get a full response" })
    @ApiBody({ type: ChatRequest })
    @ApiResponse({ status: 200, description: "The AI response" })
    async chatWithHistory(@Body() body: ChatRequest) {
        this.logger.log(`Request full response for session: ${body.sessionId}`);
        return this.chatService.getChatResponse(
            body.message,
            body.sessionId,
            body.modelId
        );
    }

    @Post("stream")
    @ApiOperation({ summary: "Send a message and get a streaming response" })
    @ApiBody({ type: ChatRequest })
    @ApiResponse({
        status: 200,
        description: "The AI response stream (Server-Sent Events)",
    })
    async streamChat(@Body() body: ChatRequest, @Res() res: Response) {
        this.logger.log(
            `Starting stream for: ${body.message} (Session: ${body.sessionId})`
        );
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // Prevent buffering
        res.status(HttpStatus.OK);

        const stream$ = this.chatService.streamChatResponse(
            body.message,
            body.sessionId,
            body.modelId
        );

        const subscription = stream$.subscribe({
            next: (val) => {
                this.logger.debug(
                    `Sending chunk for session ${body.sessionId}`
                );
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
    @ApiOperation({ summary: "Clear chat history for a session" })
    @ApiBody({ type: ClearRequest })
    @ApiResponse({ status: 200, description: "History cleared successfully" })
    clearChat(@Body() body: ClearRequest) {
        return this.chatService.clearHistory(body.sessionId);
    }

    @Get("health")
    @ApiOperation({ summary: "Get API health and active LLM provider" })
    @ApiResponse({ status: 200, description: "Health status" })
    health() {
        return this.chatService.getHealth();
    }
}
