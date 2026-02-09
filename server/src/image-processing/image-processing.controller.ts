import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
  Inject,
} from "@nestjs/common";
import { ImageProcessingService } from "./image-processing.service";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ImageProcessingRequest } from "./dto/image-processing.dto";

@ApiTags("Image Processing")
@Controller("api/image-processing")
export class ImageProcessingController {
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
      throw new HttpException(
        "Both imageBase64 and styleDescription are required",
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const result = await this.imageProcessingService.processImage(
        body.imageBase64,
        body.styleDescription,
        body.aspectRatio,
        body.style,
        body.lighting,
        body.quality,
        body.seed
      );
      return result;
    } catch (error: any) {
      throw new HttpException(
        error.message || "Image processing failed",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
