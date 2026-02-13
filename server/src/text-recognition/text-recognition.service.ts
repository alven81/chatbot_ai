import { Injectable, Logger, Inject, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import sharp from "sharp";
import {
    LlmProviderService,
    LlmInfo,
} from "../shared/llm-provider/llm-provider.service";

/**
 * Text Recognition Service using Vision-Capable LLMs for OCR.
 *
 * FACTORS AFFECTING OCR ACCURACY:
 *
 * 1. IMAGE QUALITY:
 *    - Low resolution images (< 300 DPI for printed text)
 *    - Compression artifacts (JPEG artifacts, noise)
 *    - Blurred or out-of-focus images
 *    - Poor lighting or low contrast between text and background
 *
 * 2. TEXT CHARACTERISTICS:
 *    - Handwritten text (harder than printed text)
 *    - Stylized, decorative, or unusual fonts
 *    - Very small font sizes (< 10pt)
 *    - Faded, damaged, or partially obscured text
 *    - Text with special formatting (subscripts, superscripts, equations)
 *
 * 3. LAYOUT & ORIENTATION:
 *    - Skewed or rotated text (not aligned horizontally)
 *    - Multi-column layouts (may confuse reading order)
 *    - Text embedded in complex backgrounds (photos, patterns)
 *    - Curved text (on cylinders, circles)
 *    - Perspective distortion
 *
 * 4. LANGUAGE & CHARACTER SET:
 *    - Mixed language documents (switching between scripts)
 *    - Rare or complex character sets (ancient scripts, mathematical symbols)
 *    - Right-to-left languages mixed with left-to-right
 *    - Diacritical marks and special characters
 *
 * 5. TECHNICAL LIMITATIONS:
 *    - LLM vision models have token limits (very long documents may be truncated)
 *    - Image preprocessing (resizing) may lose fine details
 *    - Different LLM models have varying OCR capabilities
 *    - Context window affects how much text can be processed at once
 *
 * BEST PRACTICES FOR BETTER RECOGNITION:
 * - Use high-resolution, well-lit, high-contrast images
 * - Ensure text is horizontally aligned
 * - Use clean, simple backgrounds
 * - Specify the correct language for better accuracy
 * - For mixed language documents, use "Mixed language text" option
 * - For unclear language, use "Auto define language" option
 */
@Injectable()
export class TextRecognitionService implements OnModuleInit {
    private readonly logger = new Logger(TextRecognitionService.name);
    private llm: ChatOpenAI | ChatGoogleGenerativeAI | null = null;
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
        // For text recognition we use the vision-capable LLM (not the raw OpenAI image API)
        // createImageProcessingProvider may return an llm (Ollama/vision) or openai (DALL-E).
        // We prefer the chat model for OCR tasks, so fall back to a chat LLM when only openai is available.
        const imgProvider =
            this.llmProviderService.createImageProcessingProvider();
        if (imgProvider.llm) {
            this.llm = imgProvider.llm;
            this.llmInfo = imgProvider.info;
        } else {
            // Fall back to a normal chat model that supports vision (e.g., gpt-4o)
            const chatProvider = this.llmProviderService.createChatLlm();
            this.llm = chatProvider.model;
            this.llmInfo = chatProvider.info;
        }
        this.logger.log(
            `Text Recognition initialized — platform: ${this.llmInfo.platform}, model: ${this.llmInfo.llm}`
        );
    }

    getHealth() {
        return {
            ...this.llmInfo,
            availableModels: this.llmProviderService.getAvailableModels(),
        };
    }

    async recognizeText(
        imageBase64: string,
        language: string = "Auto define language",
        modelId: string = "yasserrmd/Nanonets-OCR2-3B:latest"
    ): Promise<{ text: string }> {
        this.logger.log(
            `Starting text recognition | Language: "${language}" | Model: ${modelId}`
        );

        // Ensure we use the OCR model, not a text-only fallback
        const imgProvider =
            this.llmProviderService.createImageProcessingProvider(modelId);
        const llm = imgProvider.llm;

        if (!llm) {
            this.logger.error(`OCR model ${modelId} is not available`);
            throw new Error(`OCR model ${modelId} is not available`);
        }

        try {
            // Optimize image via Sharp
            this.logger.log("Optimizing input image with Sharp...");
            const inputBuffer = Buffer.from(imageBase64, "base64");
            // For VLMs like Qwen2-VL (Nanonets), it's often better to avoid
            // grayscale/normalize as they are trained on natural color images.
            const resizedBuffer = await sharp(inputBuffer)
                .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
                .toFormat("png")
                .toBuffer();

            const base64ForLlm = resizedBuffer.toString("base64");
            this.logger.log(
                `Image optimized — original: ${inputBuffer.length} bytes, optimized: ${resizedBuffer.length} bytes (2000px, PNG)`
            );

            // Build specialized OCR prompt.
            // Simplified prompt for better stability:
            const ocrPrompt =
                "Transcribe the text in the image exactly as it appears. Do not summarize. Do not explain. Do not generate any new text. Just output the text found in the image.";

            // Send to vision model
            this.logger.log("Sending image to Ollama OCR model...");

            const response = await llm.invoke([
                new HumanMessage({
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${base64ForLlm}`,
                            },
                        },
                        {
                            type: "text",
                            text: ocrPrompt,
                        },
                    ],
                }),
            ]);

            // Extract text from response
            let extractedText = "";
            if (typeof response.content === "string") {
                extractedText = response.content.trim();
            } else if (Array.isArray(response.content)) {
                extractedText = response.content
                    .map((part: any) =>
                        typeof part === "string" ? part : part.text || ""
                    )
                    .join("")
                    .trim();
            } else {
                extractedText = JSON.stringify(response.content);
            }

            this.logger.log(
                `Text recognition completed — extracted ${extractedText.length} characters`
            );
            return { text: extractedText };
        } catch (error: any) {
            this.logger.error(
                `Text recognition failed: ${error.message}`,
                error.stack
            );
            throw error;
        }
    }
}
