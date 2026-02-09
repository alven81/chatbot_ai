import { Injectable, Logger, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Observable } from "rxjs";

@Injectable()
export class ChatService implements OnModuleInit {
    private readonly logger = new Logger(ChatService.name);
    private readonly chatHistories: Map<string, BaseMessage[]> = new Map();
    private llm: any;
    private readonly outputParser = new StringOutputParser();

    constructor(@Inject(ConfigService) private configService: ConfigService) {}

    onModuleInit() {
        this.initializeLLM();
    }

    private initializeLLM() {
        const useOllama = this.configService.get("USE_OLLAMA") === "true";
        const useGoogle = this.configService.get("USE_GOOGLE_LLM") === "true";

        if (useOllama) {
            this.llm = new ChatOpenAI({
                model: "llama2",
                apiKey: "ollama",
                configuration: {
                    baseURL: "http://localhost:11434/v1",
                },
            });
        } else if (useGoogle) {
            this.llm = new ChatGoogleGenerativeAI({
                model: "gemini-2.5-flash",
            });
        } else {
            this.llm = new ChatOpenAI({
                model: "gpt-4o-mini",
            });
        }

        this.logger.log(
            `Initialized LLM: ${useOllama ? "Ollama" : useGoogle ? "Google" : "OpenAI"}`
        );
    }

    async getChatResponse(message: string, sessionId: string = "default") {
        const history = this.getHistory(sessionId);
        const chain = this.getChain();

        const response = await chain.invoke({
            question: message,
            chat_history: history,
        });

        history.push(new HumanMessage(message));
        history.push(new AIMessage(response));

        return { response, sessionId };
    }

    streamChatResponse(
        message: string,
        sessionId: string = "default"
    ): Observable<any> {
        return new Observable((subscriber) => {
            const history = this.getHistory(sessionId);
            const chain = this.getChain();

            (async () => {
                try {
                    const stream = await chain.stream({
                        question: message,
                        chat_history: history,
                    });

                    let fullResponse = "";
                    for await (const chunk of stream) {
                        fullResponse += chunk;
                        subscriber.next({ data: { chunk } });
                    }

                    history.push(new HumanMessage(message));
                    history.push(new AIMessage(fullResponse));

                    subscriber.next({ data: { done: true } });
                    subscriber.complete();
                } catch (error) {
                    this.logger.error("Streaming error", error);
                    subscriber.error(error);
                }
            })();
        });
    }

    clearHistory(sessionId: string = "default") {
        this.chatHistories.delete(sessionId);
        return { success: true, message: "Chat history cleared" };
    }

    getHealth() {
        return {
            status: "ok",
            activeProvider:
                this.configService.get("USE_OLLAMA") === "true"
                    ? "Ollama"
                    : this.configService.get("USE_GOOGLE_LLM") === "true"
                      ? "Google"
                      : "OpenAI",
        };
    }

    private getHistory(sessionId: string): BaseMessage[] {
        if (!this.chatHistories.has(sessionId)) {
            this.chatHistories.set(sessionId, []);
        }
        return this.chatHistories.get(sessionId)!;
    }

    private getChain() {
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                "You are a helpful AI assistant. Be concise and helpful in your responses.",
            ],
            new MessagesPlaceholder("chat_history"),
            ["human", "{question}"],
        ]);

        return prompt.pipe(this.llm).pipe(this.outputParser);
    }
}
