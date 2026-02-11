import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
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
}

const OLLAMA_BASE_URL = "http://localhost:11434/v1";

@Injectable()
export class LlmProviderService {
    private readonly logger = new Logger(LlmProviderService.name);

    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService
    ) {}

    getAvailableModels(): ILlmModel[] {
        const models: ILlmModel[] = [];

        // OpenAI
        const openaiKey = this.configService.get("OPENAI_API_KEY");
        if (openaiKey) {
            models.push(
                {
                    id: "gpt-4o-mini",
                    name: "GPT-4o Mini",
                    provider: "OpenAI",
                },
                { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
                {
                    id: "dall-e-3",
                    name: "DALL-E 3",
                    provider: "OpenAI",
                    isImageCapable: true,
                    isImageOnly: true,
                }
            );
        }

        // Google
        const googleKey = this.configService.get("GOOGLE_API_KEY");
        const useGoogle = this.configService.get("USE_GOOGLE_LLM") === "true";
        if (googleKey || useGoogle) {
            models.push(
                {
                    id: "gemini-2.5-flash",
                    name: "Gemini 2.5 Flash",
                    provider: "Google",
                },
                {
                    id: "gemma-2b-it",
                    name: "Gemma 2B IT",
                    provider: "Google",
                }
            );
        }

        // Ollama
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        if (useOllama) {
            models.push(
                {
                    id: "llava",
                    name: "Llama/Llava (Ollama)",
                    provider: "Ollama",
                    isImageCapable: true,
                },
                {
                    id: "moondream",
                    name: "Moondream (Ollama)",
                    provider: "Ollama",
                    isImageCapable: true,
                    isImageOnly: true,
                }
            );
        }

        return models;
    }

    createChatLlm(modelId?: string): ChatLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        const useGoogle = this.configService.get("USE_GOOGLE_LLM") === "true";

        let targetModel = modelId;

        // Default logic if no model selected
        if (!targetModel) {
            if (useOllama) {
                targetModel = "llava";
            } else if (useGoogle) {
                targetModel = "gemini-2.5-flash";
            } else {
                targetModel = "gpt-4o-mini";
            }
        }

        if (targetModel === "llava" || targetModel === "moondream") {
            const info = { platform: "Ollama", llm: targetModel };
            this.logger.log(
                `Initializing Chat LLM: ${info.platform} (${info.llm})`
            );
            return {
                model: new ChatOpenAI({
                    model: targetModel,
                    apiKey: "ollama",
                    configuration: {
                        baseURL: OLLAMA_BASE_URL,
                    },
                }),
                info,
            };
        } else if (targetModel.startsWith("gemini")) {
            const info = { platform: "Google", llm: targetModel };
            this.logger.log(
                `Initializing Chat LLM: ${info.platform} (${info.llm})`
            );
            return {
                model: new ChatGoogleGenerativeAI({
                    model: targetModel,
                    apiKey: this.configService.get("GOOGLE_API_KEY"),
                }),
                info,
            };
        } else {
            const info = { platform: "OpenAI", llm: targetModel };
            this.logger.log(
                `Initializing Chat LLM: ${info.platform} (${info.llm})`
            );
            return {
                model: new ChatOpenAI({
                    model: targetModel,
                    apiKey: this.configService.get("OPENAI_API_KEY"),
                }),
                info,
            };
        }
    }

    createLanguageTutorLlm(modelId?: string): ChatLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        let targetModel = modelId;

        if (!targetModel) {
            if (useOllama) targetModel = "llava";
            else targetModel = "gpt-4o";
        }

        if (targetModel === "llava" || targetModel === "moondream") {
            const info = { platform: "Ollama", llm: targetModel };
            this.logger.log(
                `Initializing Tutor LLM: ${info.platform} (${info.llm})`
            );
            return {
                model: new ChatOpenAI({
                    model: targetModel,
                    apiKey: "ollama",
                    temperature: 0.7,
                    configuration: { baseURL: OLLAMA_BASE_URL },
                }),
                info,
            };
        } else if (targetModel.startsWith("gemini")) {
            const info = { platform: "Google", llm: targetModel };
            return {
                model: new ChatGoogleGenerativeAI({
                    model: targetModel,
                    apiKey: this.configService.get("GOOGLE_API_KEY"),
                }),
                info,
            };
        } else {
            const info = { platform: "OpenAI", llm: targetModel };
            this.logger.log(
                `Initializing Tutor LLM: ${info.platform} (${info.llm})`
            );
            return {
                model: new ChatOpenAI({
                    model: targetModel,
                    temperature: 0.7,
                    apiKey: this.configService.get("OPENAI_API_KEY"),
                }),
                info,
            };
        }
    }

    createLanguageAnalysisLlm(modelId?: string): ChatLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        let targetModel = modelId;

        if (!targetModel) {
            if (useOllama) targetModel = "llava";
            else targetModel = "gpt-4o-mini";
        }

        if (targetModel === "llava" || targetModel === "moondream") {
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
        } else if (targetModel.startsWith("gemini")) {
            const info = { platform: "Google", llm: targetModel };
            return {
                model: new ChatGoogleGenerativeAI({
                    model: targetModel,
                    temperature: 0.2,
                    apiKey: this.configService.get("GOOGLE_API_KEY"),
                }),
                info,
            };
        } else {
            const info = { platform: "OpenAI", llm: targetModel };
            return {
                model: new ChatOpenAI({
                    model: targetModel,
                    temperature: 0.2,
                    apiKey: this.configService.get("OPENAI_API_KEY"),
                    modelKwargs: {
                        response_format: { type: "json_object" },
                    },
                }),
                info,
            };
        }
    }

    createImageProcessingProvider(modelId?: string): ImageLlmProvider {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        let targetModel = modelId;

        if (!targetModel) {
            if (useOllama) targetModel = "llava";
            else targetModel = "dall-e-3";
        }

        if (targetModel === "llava" || targetModel === "moondream") {
            const info = { platform: "Ollama", llm: targetModel };
            this.logger.log(
                `Initializing Image Provider: ${info.platform} (${info.llm})`
            );
            return {
                llm: new ChatOpenAI({
                    model: targetModel,
                    apiKey: "ollama",
                    configuration: {
                        baseURL: OLLAMA_BASE_URL,
                    },
                }),
                info,
            };
        } else if (
            targetModel === "dall-e" ||
            targetModel === "dall-e-3" ||
            targetModel === "dall-e-2"
        ) {
            const info = { platform: "OpenAI", llm: targetModel };
            this.logger.log(
                `Initializing Image Provider: ${info.platform} (${info.llm})`
            );
            return {
                openai: new OpenAI({
                    apiKey: this.configService.get("OPENAI_API_KEY"),
                }),
                info,
            };
        } else {
            // Fallback
            const info = { platform: "OpenAI", llm: targetModel || "dall-e-3" };
            this.logger.log(
                `Initializing Image Provider: ${info.platform} (${info.llm})`
            );
            return {
                openai: new OpenAI({
                    apiKey: this.configService.get("OPENAI_API_KEY"),
                }),
                info,
            };
        }
    }
}
