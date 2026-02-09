import {
    Controller,
    Post,
    Body,
    Get,
    Res,
    HttpStatus,
    Inject,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import type { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ChatRequest, ClearRequest } from "./dto/chat.dto";

@ApiTags("Chat")
@Controller("api")
export class ChatController {
    constructor(
        @Inject(ChatService) private readonly chatService: ChatService
    ) {}

    @Post("chat/history")
    @ApiOperation({ summary: "Send a message and get a full response" })
    @ApiBody({ type: ChatRequest })
    @ApiResponse({ status: 200, description: "The AI response" })
    async chatWithHistory(@Body() body: ChatRequest) {
        return this.chatService.getChatResponse(body.message, body.sessionId);
    }

    @Post("chat/stream")
    @ApiOperation({ summary: "Send a message and get a streaming response" })
    @ApiBody({ type: ChatRequest })
    @ApiResponse({
        status: 200,
        description: "The AI response stream (Server-Sent Events)",
    })
    async streamChat(@Body() body: ChatRequest, @Res() res: Response) {
        console.log(`[ChatController] Starting stream for: ${body.message}`);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // Prevent buffering
        res.status(HttpStatus.OK);

        const stream$ = this.chatService.streamChatResponse(
            body.message,
            body.sessionId
        );

        const subscription = stream$.subscribe({
            next: (val) => {
                console.log(
                    `[ChatController] Sending chunk: ${JSON.stringify(val.data)}`
                );
                res.write(`data: ${JSON.stringify(val.data)}\n\n`);
            },
            error: (err) => {
                console.error(`[ChatController] Stream error: ${err.message}`);
                res.write(
                    `data: ${JSON.stringify({ error: err.message })}\n\n`
                );
                res.end();
            },
            complete: () => {
                console.log(`[ChatController] Stream complete`);
                res.end();
            },
        });

        res.on("close", () => {
            console.log("[ChatController] Client closed connection");
            subscription.unsubscribe();
        });
    }

    @Post("chat/clear")
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
