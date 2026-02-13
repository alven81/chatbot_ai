import {
    Controller,
    Post,
    Get,
    Body,
    HttpStatus,
    HttpException,
    Inject,
    Logger,
} from "@nestjs/common";
import { TextRecognitionService } from "./text-recognition.service";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { TextRecognitionRequest } from "./dto/text-recognition.dto";

@ApiTags("Text Recognition")
@Controller("text-recognition")
export class TextRecognitionController {
    private readonly logger = new Logger(TextRecognitionController.name);

    constructor(
        @Inject(TextRecognitionService)
        private readonly textRecognitionService: TextRecognitionService
    ) {}

    @Post("recognize")
    @ApiOperation({
        summary:
            "Recognize text in an image using OCR via a vision-capable LLM",
    })
    @ApiBody({ type: TextRecognitionRequest })
    @ApiResponse({
        status: 200,
        description: "Recognized text returned",
    })
    @ApiResponse({ status: 400, description: "Invalid request" })
    @ApiResponse({ status: 500, description: "Text recognition failed" })
    async recognizeText(@Body() body: TextRecognitionRequest) {
        if (!body.imageBase64) {
            this.logger.warn("Received invalid request: missing image");
            throw new HttpException(
                "imageBase64 is required",
                HttpStatus.BAD_REQUEST
            );
        }

        this.logger.log(
            `Text recognition request | Language: ${body.language || "Auto define language"}`
        );
        try {
            const result = await this.textRecognitionService.recognizeText(
                body.imageBase64,
                body.language,
                body.modelId
            );
            this.logger.log("Text recognition request processed successfully");
            return result;
        } catch (error: any) {
            this.logger.error(
                `Text recognition request failed: ${error.message}`
            );
            throw new HttpException(
                error.message || "Text recognition failed",
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get("health")
    @ApiOperation({ summary: "Get API health and active LLM provider" })
    @ApiResponse({ status: 200, description: "Health status" })
    health() {
        return this.textRecognitionService.getHealth();
    }
}
