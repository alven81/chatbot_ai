import { Injectable, Logger, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Observable } from "rxjs";
import {
    LlmProviderService,
    LlmInfo,
} from "../shared/llm-provider/llm-provider.service";

@Injectable()
export class ChatService implements OnModuleInit {
    private readonly logger = new Logger(ChatService.name);
    private readonly chatHistories: Map<string, BaseMessage[]> = new Map();
    private llm: any;
    private llmInfo!: LlmInfo;
    private readonly outputParser = new StringOutputParser();

    constructor(
        private readonly configService: ConfigService,
        @Inject(LlmProviderService)
        private readonly llmProviderService: LlmProviderService
    ) {}

    onModuleInit() {
        this.initializeLLM();
    }

    private initializeLLM() {
        const { model, info } = this.llmProviderService.createChatLlm();
        this.llm = model;
        this.llmInfo = info;
    }

    async getChatResponse(
        message: string,
        sessionId: string = "default",
        modelId?: string
    ) {
        this.logger.log(
            `Generating chat response for session: ${sessionId} with model: ${modelId || "default"}`
        );
        const history = this.getHistory(sessionId);
        const chain = this.getChain(modelId);

        const response = await chain.invoke({
            question: message,
            chat_history: history,
        });

        history.push(new HumanMessage(message), new AIMessage(response));

        this.logger.log(`Chat response generated for session: ${sessionId}`);
        return { response, sessionId };
    }

    streamChatResponse(
        message: string,
        sessionId: string = "default",
        modelId?: string
    ): Observable<any> {
        this.logger.log(
            `Starting chat stream for session: ${sessionId} with model: ${modelId || "default"}`
        );
        return new Observable((subscriber) => {
            const history = this.getHistory(sessionId);
            const chain = this.getChain(modelId);

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

                    this.logger.log(
                        `Chat stream completed for session: ${sessionId}`
                    );
                    subscriber.next({ data: { done: true } });
                    subscriber.complete();
                } catch (error: any) {
                    this.logger.error(
                        `Streaming error for session ${sessionId}: ${error.message}`,
                        error.stack
                    );
                    subscriber.error(error);
                }
            })();
        });
    }

    clearHistory(sessionId: string = "default") {
        this.logger.log(`Clearing chat history for session: ${sessionId}`);
        this.chatHistories.delete(sessionId);
        return { success: true, message: "Chat history cleared" };
    }

    getHealth() {
        return {
            ...this.llmInfo,
            availableModels: this.llmProviderService.getAvailableModels(),
        };
    }

    private getHistory(sessionId: string): BaseMessage[] {
        if (!this.chatHistories.has(sessionId)) {
            this.chatHistories.set(sessionId, []);
        }
        return this.chatHistories.get(sessionId)!;
    }

    private getChain(modelId?: string) {
        const { model } = this.llmProviderService.createChatLlm(modelId);

        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                "You are a helpful AI assistant. Be concise and helpful in your responses.",
            ],
            new MessagesPlaceholder("chat_history"),
            ["human", "{question}"],
        ]);

        return prompt.pipe(model).pipe(this.outputParser);
    }
}
