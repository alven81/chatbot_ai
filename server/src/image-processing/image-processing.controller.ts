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
import { ImageProcessingService } from "./image-processing.service";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ImageProcessingRequest } from "./dto/image-processing.dto";

@ApiTags("Image Processing")
@Controller("image-processing")
export class ImageProcessingController {
    private readonly logger = new Logger(ImageProcessingController.name);
    constructor(
        @Inject(ImageProcessingService)
        private readonly imageProcessingService: ImageProcessingService
    ) {}

    @Post("process")
    @ApiOperation({
        summary:
            "Process an image: remove background and change clothing to described style",
    })
    @ApiBody({ type: ImageProcessingRequest })
    @ApiResponse({
        status: 200,
        description: "Processed image returned as base64",
    })
    @ApiResponse({ status: 400, description: "Invalid request" })
    @ApiResponse({ status: 500, description: "Image processing failed" })
    async processImage(@Body() body: ImageProcessingRequest) {
        if (!body.imageBase64 || !body.styleDescription) {
            this.logger.warn(
                "Received invalid request: missing image or style"
            );
            throw new HttpException(
                "Both imageBase64 and styleDescription are required",
                HttpStatus.BAD_REQUEST
            );
        }

        this.logger.log(
            `Processing image request with style: ${body.styleDescription}`
        );
        try {
            const result = await this.imageProcessingService.processImage(
                body.imageBase64,
                body.styleDescription,
                body.aspectRatio,
                body.style,
                body.lighting,
                body.quality,
                body.seed,
                body.modelId
            );
            this.logger.log("Image request processed successfully");
            return result;
        } catch (error: any) {
            this.logger.error(`Image request failed: ${error.message}`);
            throw new HttpException(
                error.message || "Image processing failed",
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get("health")
    @ApiOperation({ summary: "Get API health and active LLM provider" })
    @ApiResponse({ status: 200, description: "Health status" })
    health() {
        return this.imageProcessingService.getHealth();
    }
}
