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

const OLLAMA_BASE_URL =
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";

const OLLAMA_MODELS = new Set([
    "llava",
    "moondream",
    "yasserrmd/Nanonets-OCR2-3B:latest",
]);

const GOOGLE_MODELS = new Set(["gemini-3.1-pro-preview"]);

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

        const useOllama = this.configService.get("USE_OLLAMA");
        const openaiKey = this.configService.get("OPENAI_API_KEY");
        const googleKey = this.configService.get("GOOGLE_API_KEY");

        if (useOllama) {
            models.push(
                {
                    id: "llava",
                    name: "Llava (Ollama)",
                    provider: "Ollama",
                    isImageCapable: true,
                    isOcrOnly: false,
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

        if (openaiKey) {
            models.push(
                {
                    id: "gpt-4o",
                    name: "GPT-4o",
                    provider: "OpenAI",
                    isImageCapable: true,
                    isOcrOnly: true,
                },
                {
                    id: "gpt-4o-mini",
                    name: "GPT-4o Mini",
                    provider: "OpenAI",
                    isImageCapable: true,
                    isOcrOnly: true,
                }
            );
        }

        if (googleKey) {
            models.push({
                id: "gemini-3.1-pro-preview",
                name: "Gemini 3.1 Pro Preview",
                provider: "Google",
            });
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
        const useGoogle = this.configService.get("USE_GOOGLE_LLM") === "true";
        let defaultModel: string;
        if (useOllama) {
            defaultModel = "llava";
        } else if (useGoogle) {
            defaultModel = "gemini-2.0-flash";
        } else {
            defaultModel = "gpt-4o";
        }
        const targetModel = modelId ?? defaultModel;

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

        if (GOOGLE_MODELS.has(targetModel)) {
            return {
                model: new ChatGoogleGenerativeAI({
                    model: targetModel,
                    temperature: 0.7,
                    apiKey: this.configService.get("GOOGLE_API_KEY"),
                }),
                info: { platform: "Google", llm: targetModel },
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
        const useGoogle = this.configService.get("USE_GOOGLE_LLM") === "true";
        let defaultModel: string;
        if (useOllama) {
            defaultModel = "llava";
        } else if (useGoogle) {
            defaultModel = "gemini-2.0-flash";
        } else {
            defaultModel = "gpt-4o-mini";
        }
        const targetModel = modelId ?? defaultModel;

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

        if (GOOGLE_MODELS.has(targetModel)) {
            return {
                model: new ChatGoogleGenerativeAI({
                    model: targetModel,
                    temperature: 0.2,
                    apiKey: this.configService.get("GOOGLE_API_KEY"),
                }),
                info: { platform: "Google", llm: targetModel },
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
            const isOcr = targetModel === OCR_MODEL;

            return {
                llm: new ChatOpenAI({
                    model: targetModel,
                    apiKey: "ollama",
                    temperature: 0,
                    maxTokens: isOcr ? 2048 : 4096,
                    configuration: { baseURL: OLLAMA_BASE_URL },
                    // Prevent repetition loops that produce hallucinated binary/garbage output
                    modelKwargs: isOcr
                        ? {
                              repeat_penalty: 1.3,
                              num_ctx: 8192,
                              top_p: 0.9,
                          }
                        : {},
                }),
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
