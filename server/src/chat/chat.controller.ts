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

@Controller("api")
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post("chat/history")
  async chatWithHistory(@Body() body: { message: string; sessionId?: string }) {
    return this.chatService.getChatResponse(body.message, body.sessionId);
  }

  @Post("chat/stream")
  async streamChat(
    @Body() body: { message: string; sessionId?: string },
    @Res() res: Response
  ) {
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
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
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
  clearChat(@Body() body: { sessionId?: string }) {
    return this.chatService.clearHistory(body.sessionId);
  }

  @Get("health")
  health() {
    return this.chatService.getHealth();
  }
}
