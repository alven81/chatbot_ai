import { Injectable, Logger, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Observable } from "rxjs";

@Injectable()
export class LanguageLearningService implements OnModuleInit {
    private readonly logger = new Logger(LanguageLearningService.name);
    private readonly chatHistories: Map<string, BaseMessage[]> = new Map();
    private llm!: ChatOpenAI;
    private analysisLlm!: ChatOpenAI;
    private readonly outputParser = new StringOutputParser();

    constructor(@Inject(ConfigService) private configService: ConfigService) {}

    onModuleInit() {
        this.initializeLLM();
    }

    private initializeLLM() {
        // Use GPT-4o for language tutoring — best for nuanced grammar,
        // translations, and natural conversation across languages.
        this.llm = new ChatOpenAI({
            model: "gpt-4o",
            temperature: 0.7,
        });

        // A separate fast model instance for analyzing user messages
        // (translation + corrections) so the main response isn't blocked.
        this.analysisLlm = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0.2,
        });

        this.logger.log("Initialized Language Learning LLM: GPT-4o");
    }

    /**
     * Analyze the user's message: translate it to their native language
     * and point out any grammar / vocabulary mistakes.
     */
    async analyzeUserMessage(
        message: string,
        learningLanguage: string,
        userLanguage: string
    ): Promise<{ translation: string; corrections: string }> {
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a language analysis assistant. The user is learning ${learningLanguage} and speaks ${userLanguage}.
Analyze the user's message and return a JSON object with exactly two keys:
- "translation": translate the user's message into ${userLanguage}. If the message is already in ${userLanguage}, translate it to ${learningLanguage} instead and note that.
- "corrections": if the user made any grammar, spelling, or word-choice mistakes in ${learningLanguage}, explain them clearly in ${userLanguage}. If the message was perfect or was written in ${userLanguage}, set this to an empty string "".

Return ONLY valid JSON, no markdown fences.`,
            ],
            ["human", "{message}"],
        ]);

        const chain = prompt.pipe(this.analysisLlm).pipe(this.outputParser);

        try {
            const raw = await chain.invoke({ message });
            const parsed = JSON.parse(raw);
            return {
                translation: parsed.translation || "",
                corrections: parsed.corrections || "",
            };
        } catch (err) {
            this.logger.warn("Failed to parse analysis response", err);
            return { translation: "", corrections: "" };
        }
    }

    /**
     * Stream the tutor's conversational response while also
     * sending back translation + correction metadata.
     */
    streamResponse(
        message: string,
        sessionId: string = "default",
        learningLanguage: string = "Spanish",
        userLanguage: string = "English"
    ): Observable<any> {
        return new Observable((subscriber) => {
            const history = this.getHistory(sessionId);
            const chain = this.getTutorChain(learningLanguage, userLanguage);

            (async () => {
                try {
                    // Run analysis in parallel with streaming
                    const analysisPromise = this.analyzeUserMessage(
                        message,
                        learningLanguage,
                        userLanguage
                    );

                    // Stream the tutor response
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

                    // Send analysis results
                    const analysis = await analysisPromise;
                    if (analysis.translation) {
                        subscriber.next({
                            data: { translation: analysis.translation },
                        });
                    }
                    if (analysis.corrections) {
                        subscriber.next({
                            data: { corrections: analysis.corrections },
                        });
                    }

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
        return {
            success: true,
            message: "Language learning chat history cleared",
        };
    }

    private getHistory(sessionId: string): BaseMessage[] {
        if (!this.chatHistories.has(sessionId)) {
            this.chatHistories.set(sessionId, []);
        }
        return this.chatHistories.get(sessionId)!;
    }

    private getTutorChain(learningLanguage: string, userLanguage: string) {
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a friendly and patient language tutor helping a student learn ${learningLanguage}. The student's native language is ${userLanguage}.

Your behavior:
1. Always respond primarily in ${learningLanguage}.
2. Keep your responses conversational — ask follow-up questions to keep the conversation going naturally.
3. Adapt difficulty to the student's level based on their messages.
4. Occasionally introduce new vocabulary or expressions, explaining them briefly in ${userLanguage} within parentheses.
5. If the student writes in ${userLanguage}, gently encourage them to try in ${learningLanguage}, but still answer their question.
6. Be encouraging and supportive. Celebrate progress.
7. Mix topics: daily life, culture, travel, hobbies — whatever keeps the student engaged.
8. Keep responses concise (2-4 sentences typically) to encourage back-and-forth dialogue.`,
            ],
            new MessagesPlaceholder("chat_history"),
            ["human", "{question}"],
        ]);

        return prompt.pipe(this.llm).pipe(this.outputParser);
    }
}
