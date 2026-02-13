import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import OpenAI from "openai";

export interface LlmInfo {
    platform: string;
    llm: string;
}

export interface ChatLlmProvider {
    model: ChatOpenAI | ChatGoogleGenerativeAI;
    info: LlmInfo;
}

export interface ImageLlmProvider {
    openai?: OpenAI;
    llm?: ChatOpenAI;
    info: LlmInfo;
}

export interface ILlmModel {
    id: string;
    name: string;
    provider: string;
    isImageCapable?: boolean;
    isImageOnly?: boolean;
    isOcrOnly?: boolean;
}

const OLLAMA_BASE_URL = "http://localhost:11434/v1";

const OLLAMA_MODELS = new Set([
    "llava",
    "moondream",
    "yasserrmd/Nanonets-OCR2-3B:latest",
]);

const OCR_MODEL = "yasserrmd/Nanonets-OCR2-3B:latest";

@Injectable()
export class LlmProviderService {
    private readonly logger = new Logger(LlmProviderService.name);

    constructor(
        @Inject(ConfigService)
        private readonly configService: ConfigService
    ) {}

    /* ------------------------------------------------ */
    /*                     MODELS                       */
    /* ------------------------------------------------ */

    getAvailableModels(): ILlmModel[] {
        const models: ILlmModel[] = [];

        const useOllama = this.configService.get("USE_OLLAMA") === "true";

        if (useOllama) {
            models.push(
                {
                    id: "llava",
                    name: "Llava (Ollama)",
                    provider: "Ollama",
                    isImageCapable: true,
                },
                {
                    id: OCR_MODEL,
                    name: "Nanonets OCR (Ollama)",
                    provider: "Ollama",
                    isImageCapable: true,
                    isOcrOnly: true,
                }
            );
        }

        return models;
    }

    /* ------------------------------------------------ */
    /*               OLLAMA BASE FACTORY                */
    /* ------------------------------------------------ */

    private createOllamaModel(
        model: string,
        temperature = 0.7,
        maxTokens?: number
    ): ChatOpenAI {
        return new ChatOpenAI({
            model,
            apiKey: "ollama", // dummy value required
            temperature,
            maxTokens,
            configuration: {
                baseURL: OLLAMA_BASE_URL,
            },
        });
    }

    /* ------------------------------------------------ */
    /*                  CHAT LLM                        */
    /* ------------------------------------------------ */

    createChatLlm(modelId?: string): ChatLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        const targetModel = modelId ?? (useOllama ? "llava" : "gpt-4o-mini");

        if (useOllama && OLLAMA_MODELS.has(targetModel)) {
            const info = { platform: "Ollama", llm: targetModel };
            this.logger.log(`Initializing Chat LLM: ${info.llm}`);

            const isOcr = targetModel === OCR_MODEL;

            return {
                model: this.createOllamaModel(
                    targetModel,
                    isOcr ? 0 : 0.7,
                    isOcr ? 4096 : undefined
                ),
                info,
            };
        }

        // OpenAI fallback
        return {
            model: new ChatOpenAI({
                model: targetModel,
                apiKey: this.configService.get("OPENAI_API_KEY"),
            }),
            info: { platform: "OpenAI", llm: targetModel },
        };
    }

    createLanguageTutorLlm(modelId?: string): ChatLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        const targetModel = modelId ?? (useOllama ? "llava" : "gpt-4o");

        if (useOllama && OLLAMA_MODELS.has(targetModel)) {
            const info = { platform: "Ollama", llm: targetModel };
            const isOcr = targetModel === OCR_MODEL;
            return {
                model: this.createOllamaModel(
                    targetModel,
                    isOcr ? 0 : 0.7,
                    isOcr ? 4096 : undefined
                ),
                info,
            };
        }

        return {
            model: new ChatOpenAI({
                model: targetModel,
                temperature: 0.7,
                apiKey: this.configService.get("OPENAI_API_KEY"),
            }),
            info: { platform: "OpenAI", llm: targetModel },
        };
    }

    createLanguageAnalysisLlm(modelId?: string): ChatLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        const targetModel = modelId ?? (useOllama ? "llava" : "gpt-4o-mini");

        if (useOllama && OLLAMA_MODELS.has(targetModel)) {
            const info = { platform: "Ollama", llm: targetModel };
            return {
                model: new ChatOpenAI({
                    model: targetModel,
                    apiKey: "ollama",
                    temperature: 0.2,
                    configuration: { baseURL: OLLAMA_BASE_URL },
                    modelKwargs: {
                        response_format: { type: "json_object" },
                    },
                }),
                info,
            };
        }

        return {
            model: new ChatOpenAI({
                model: targetModel,
                temperature: 0.2,
                apiKey: this.configService.get("OPENAI_API_KEY"),
                modelKwargs: {
                    response_format: { type: "json_object" },
                },
            }),
            info: { platform: "OpenAI", llm: targetModel },
        };
    }

    /* ------------------------------------------------ */
    /*                  IMAGE LLM                       */
    /* ------------------------------------------------ */

    createImageProcessingProvider(modelId?: string): ImageLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        const targetModel = modelId ?? (useOllama ? OCR_MODEL : "dall-e-3");

        if (useOllama && OLLAMA_MODELS.has(targetModel)) {
            const info = { platform: "Ollama", llm: targetModel };
            this.logger.log(`Initializing Image Provider: ${info.llm}`);

            return {
                llm: this.createOllamaModel(targetModel, 0, 4096),
                info,
            };
        }

        return {
            openai: new OpenAI({
                apiKey: this.configService.get("OPENAI_API_KEY"),
            }),
            info: { platform: "OpenAI", llm: targetModel },
        };
    }

    /* ------------------------------------------------ */
    /*                    OCR HELPER                    */
    /* ------------------------------------------------ */

    async extractTextFromBase64Image(
        base64Image: string,
        prompt = "Extract all text exactly as written."
    ): Promise<string> {
        const provider = this.createImageProcessingProvider(OCR_MODEL);

        if (!provider.llm) {
            throw new Error("OCR model not available.");
        }

        const response = await provider.llm.invoke([
            new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: prompt,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${base64Image}`,
                        },
                    },
                ],
            }),
        ]);

        return response.content as string;
    }
}
