import { Injectable, Logger, Inject, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI, { toFile } from "openai";
import { AspectRatio, LightingStyle } from "./dto/image-processing.dto";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import sharp from "sharp";
import {
    LlmProviderService,
    LlmInfo,
} from "../shared/llm-provider/llm-provider.service";

@Injectable()
export class ImageProcessingService implements OnModuleInit {
    private readonly logger = new Logger(ImageProcessingService.name);
    private openai: OpenAI | null = null;
    private llm: ChatOpenAI | null = null;
    private llmInfo!: LlmInfo;

    constructor(
        private readonly configService: ConfigService,
        @Inject(LlmProviderService)
        private readonly llmProviderService: LlmProviderService
    ) {}

    onModuleInit() {
        this.initializeProvider();
    }

    private initializeProvider() {
        const { openai, llm, info } =
            this.llmProviderService.createImageProcessingProvider();
        this.openai = openai || null;
        this.llm = llm || null;
        this.llmInfo = info;
    }

    getHealth() {
        return {
            ...this.llmInfo,
            availableModels: this.llmProviderService.getAvailableModels(),
        };
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
        seed?: number,
        modelId?: string
    ): Promise<{ resultBase64: string }> {
        // Dynamic provider creation
        let provider: { openai?: OpenAI | null; llm?: ChatOpenAI | null } = {
            openai: this.openai,
            llm: this.llm,
        };
        if (modelId) {
            const p =
                this.llmProviderService.createImageProcessingProvider(modelId);
            provider = { openai: p.openai, llm: p.llm };
        }

        if (provider.llm) {
            return this.processWithOllama(imageBase64, styleDescription);
        }

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

            const openai = provider.openai || this.openai;
            if (!openai) throw new Error("No OpenAI provider available");

            const response = await openai.images.edit({
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

    private async processWithOllama(
        imageBase64: string,
        styleDescription: string
    ): Promise<{ resultBase64: string }> {
        this.logger.log("Analyzing image with Ollama (LLaVA)...");
        try {
            // 1. Оптимизация изображения через Sharp
            const inputBuffer = Buffer.from(imageBase64, "base64");
            // Изменяем размер для ускорения обработки и приводим к PNG
            const resizedBuffer = await sharp(inputBuffer)
                .resize(600, 600, {
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .toFormat("png")
                .toBuffer();

            const base64ForLlm = resizedBuffer.toString("base64");

            // 2. Отправка в LLaVA
            const response = await this.llm!.invoke([
                new HumanMessage({
                    content: [
                        {
                            type: "text",
                            text: `Briefly describe this image and explain how it would look IF the clothing was changed to: ${styleDescription}. Start with "Analysis: ..."`,
                        },
                        {
                            type: "image_url",
                            image_url: `data:image/png;base64,${base64ForLlm}`,
                        },
                    ],
                }),
            ]);

            const analysisText = response.content.toString();
            this.logger.log(
                `LLaVA Analysis: ${analysisText.substring(0, 100)}...`
            );

            // 3. Наложение текста на изображение (так как LLaVA не генерирует картинки)
            const metadata = await sharp(resizedBuffer).metadata();
            const width = metadata.width || 600;
            const height = metadata.height || 600;

            // Простая SVG подложка с текстом
            // Разбиваем текст на строки примерно по 50 символов
            const words = analysisText.split(" ");
            let lines: string[] = [];
            let currentLine = "";

            words.forEach((word) => {
                if ((currentLine + word).length > 60) {
                    lines.push(currentLine);
                    currentLine = word + " ";
                } else {
                    currentLine += word + " ";
                }
            });
            lines.push(currentLine);
            lines = lines.slice(0, 6); // Берем только первые 6 строк чтобы влезло

            const lineHeight = 20;
            const boxHeight = lines.length * lineHeight + 20;

            const svgText = `
            <svg width="${width}" height="${height}">
                <rect x="0" y="${height - boxHeight}" width="${width}" height="${boxHeight}" fill="rgba(0,0,0,0.7)" />
                ${lines
                    .map(
                        (line, i) =>
                            `<text x="10" y="${height - boxHeight + 20 + i * lineHeight}" font-family="Arial" font-size="14" fill="white">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`
                    )
                    .join("")}
            </svg>
            `;

            const finalImage = await sharp(resizedBuffer)
                .composite([{ input: Buffer.from(svgText), gravity: "south" }])
                .toBuffer();

            return { resultBase64: finalImage.toString("base64") };
        } catch (error) {
            this.logger.error("Ollama processing failed", error);
            // В случае ошибки возвращаем исходное изображение (без обработки)
            return { resultBase64: imageBase64 };
        }
    }
}
