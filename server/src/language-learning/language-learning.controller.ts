import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { LanguageLearningService } from "./language-learning.service";
import type { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import {
  LanguageLearningRequest,
  LanguageLearningClearRequest,
} from "./dto/language-learning.dto";

@ApiTags("Language Learning")
@Controller("api/language-learning")
export class LanguageLearningController {
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
    console.log(
      `[LanguageLearning] Starting stream for: ${body.message} (${body.learningLanguage})`
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
      body.userLanguage
    );

    const subscription = stream$.subscribe({
      next: (val) => {
        res.write(`data: ${JSON.stringify(val.data)}\n\n`);
      },
      error: (err) => {
        console.error(`[LanguageLearning] Stream error: ${err.message}`);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        console.log(`[LanguageLearning] Stream complete`);
        res.end();
      },
    });

    res.on("close", () => {
      console.log("[LanguageLearning] Client closed connection");
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
}
