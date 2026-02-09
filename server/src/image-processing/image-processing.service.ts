import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI, { toFile } from "openai";
import { AspectRatio, LightingStyle } from "./dto/image-processing.dto";

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);
  private readonly openai: OpenAI;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get("OPENAI_API_KEY"),
    });
  }

  private mapAspectRatioToSize(
    aspectRatio?: AspectRatio
  ): "256x256" | "512x512" | "1024x1024" {
    // OpenAI Images Edit API only supports fixed sizes: 256x256, 512x512, 1024x1024
    // Both 3:4 and 2:3 ratios work best with 1024x1024 for full head + torso composition
    return "1024x1024";
  }

  async processImage(
    imageBase64: string,
    styleDescription: string,
    aspectRatio?: AspectRatio,
    style: string = "photorealistic",
    lighting: LightingStyle = LightingStyle.CINEMATIC,
    quality: string = "high",
    seed?: number
  ): Promise<{ resultBase64: string }> {
    this.logger.log(
      `Processing image | Style: "${styleDescription}" | Aspect: ${aspectRatio} | Lighting: ${lighting}`
    );

    const size = this.mapAspectRatioToSize(aspectRatio);

    // Build comprehensive prompt incorporating all settings
    const prompt = [
      "Edit this photo of a person:",
      "1) Remove the entire background and replace it with a clean, solid white background.",
      `2) Change the person's clothing to match this style: ${styleDescription}.`,
      "3) Keep the person's face, skin tone, hairstyle, body proportions, and pose exactly the same.",
      `4) Photography style: ${style}. Lighting: ${lighting}. Quality: ${quality} detail and clarity.`,
      "5) The result should look like a professional fashion/portrait photo.",
      seed ? `[Consistency seed: ${seed}]` : "",
    ]
      .filter((s) => s.length > 0)
      .join(" ");

    try {
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const imageFile = await toFile(imageBuffer, "input.png", {
        type: "image/png",
      });

      const response = await this.openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt,
        n: 1,
        size: size,
      });

      const resultBase64 = response.data?.[0]?.b64_json;

      if (!resultBase64) {
        throw new Error("No image was returned from OpenAI");
      }

      this.logger.log("Image processed successfully");
      return { resultBase64 };
    } catch (error: any) {
      this.logger.error(`Image processing failed: ${error.message}`);
      throw error;
    }
  }
}
