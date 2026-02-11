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
import {
    LlmProviderService,
    LlmInfo,
} from "../shared/llm-provider/llm-provider.service";

@Injectable()
export class LanguageLearningService implements OnModuleInit {
    private readonly logger = new Logger(LanguageLearningService.name);
    private readonly chatHistories: Map<string, BaseMessage[]> = new Map();
    private llm!: ChatOpenAI;
    private analysisLlm!: ChatOpenAI;
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
        const tutor = this.llmProviderService.createLanguageTutorLlm();
        this.llm = tutor.model as ChatOpenAI;
        this.llmInfo = tutor.info;

        const analysis = this.llmProviderService.createLanguageAnalysisLlm();
        this.analysisLlm = analysis.model as ChatOpenAI;
    }

    getHealth() {
        return {
            ...this.llmInfo,
            availableModels: this.llmProviderService.getAvailableModels(),
        };
    }

    /**
     * Analyze the user's message: translate it to their native language
     * and point out any grammar / vocabulary mistakes.
     */
    async analyzeUserMessage(
        message: string,
        learningLanguage: string,
        userLanguage: string,
        modelId?: string
    ): Promise<{ translation: string; corrections: string; proposal: string }> {
        this.logger.log(`Analyzing user message for ${learningLanguage}`);
        //         const prompt = ChatPromptTemplate.fromMessages([
        //             [
        //                 "system",
        //                 `You are a language analysis assistant. The user is learning ${learningLanguage} and speaks ${userLanguage}.
        // Analyze the user's input and provide feedback in JSON format.
        // Your output must be a valid JSON object with these EXACT keys:
        // {{
        //   "proposal": "The corrected version of user's message in ${learningLanguage}",
        //   "translation": "Translation of proposal into ${userLanguage}",
        //   "corrections": "Explanation of mistakes or improvements in ${userLanguage}"
        // }}
        // IMPORTANT: DO NOT engage in conversation. DO NOT answer questions. ONLY return the JSON object.`,
        //             ],
        //             [
        //                 "human",
        //                 `Analyze the following message from a learner of ${learningLanguage}:\n\n{message}\n\nReturn strictly valid JSON only.`,
        //             ],
        //         ]);

        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a language analysis assistant. The user is learning ${learningLanguage} and speaks ${userLanguage}.
Analyze the user's message and return a JSON object with exactly three keys:
- "proposal": Rewrite the user's message correctly in ${learningLanguage}. If the message was already correct or written in ${userLanguage}, provide a natural, correct version of what they meant in ${learningLanguage}.
- "translation": Translate the "proposal" version into ${userLanguage}, be polite, never use offensive/vulgar language (even if the user does); paraphrase neutrally.
- "corrections": If the user made any grammar, spelling, or word-choice mistakes in ${learningLanguage}, explain them clearly in ${userLanguage}. If the message was perfect or written in ${userLanguage}, mention why the proposal is a better more natural alternative or keep it brief. 

Return ONLY valid JSON, no markdown fences.`,
            ],
            ["human", "{message}"],
        ]);

        const { model } =
            this.llmProviderService.createLanguageAnalysisLlm(modelId);
        const chain = prompt.pipe(model).pipe(this.outputParser);

        try {
            const raw = await chain.invoke({ message });

            // Поиск начала и конца JSON объекта
            const startToken = raw.indexOf("{");
            const endToken = raw.lastIndexOf("}");

            if (startToken === -1 || endToken === -1) {
                this.logger.warn(`No JSON found in analysis response: ${raw}`);
                throw new Error("No JSON object found in response");
            }

            const cleaned = raw.substring(startToken, endToken + 1);
            const parsed = JSON.parse(cleaned);
            this.logger.log(`Analysis complete for ${learningLanguage}`);
            return {
                proposal: parsed.proposal || "",
                translation: parsed.translation || "",
                corrections: parsed.corrections || "",
            };
        } catch (err: any) {
            this.logger.warn(
                `Failed to parse analysis response: ${err.message}`
            );
            return { proposal: "", translation: "", corrections: "" };
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
        userLanguage: string = "English",
        learningLevel: string = "A1",
        userProfession: string = "General",
        modelId?: string
    ): Observable<any> {
        this.logger.log(
            `Starting language tutor stream for session: ${sessionId}`
        );
        return new Observable((subscriber) => {
            const history = this.getHistory(sessionId);
            const chain = this.getTutorChain(
                learningLanguage,
                userLanguage,
                learningLevel,
                userProfession,
                modelId
            );

            (async () => {
                try {
                    // Run analysis in parallel with streaming
                    const analysisPromise = this.analyzeUserMessage(
                        message,
                        learningLanguage,
                        userLanguage,
                        modelId
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

                    history.push(
                        new HumanMessage(message),
                        new AIMessage(fullResponse)
                    );

                    // Send analysis results
                    const analysis = await analysisPromise;
                    if (analysis.proposal) {
                        subscriber.next({
                            data: { proposal: analysis.proposal },
                        });
                    }
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

                    this.logger.log(
                        `Language tutor stream completed for session: ${sessionId}`
                    );
                    subscriber.next({ data: { done: true } });
                    subscriber.complete();
                } catch (error: any) {
                    this.logger.error(
                        `Language tutor streaming error for session ${sessionId}: ${error.message}`,
                        error.stack
                    );
                    subscriber.error(error);
                }
            })();
        });
    }

    clearHistory(sessionId: string = "default") {
        this.logger.log(`Clearing language history for session: ${sessionId}`);
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

    private getTutorChain(
        learningLanguage: string,
        userLanguage: string,
        learningLevel: string,
        userProfession: string,
        modelId?: string
    ) {
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a friendly and patient language tutor helping a student learn ${learningLanguage}. The student's native language is ${userLanguage}.

User Profile:
- Proficiency Level: ${learningLevel}
- Profession: ${userProfession}

Your behavior:
1. Always respond primarily in ${learningLanguage}.
2. Be polite; never use offensive/vulgar language (even if the user does); paraphrase neutrally.
3. Keep your responses conversational — ask follow-up questions to keep the conversation going naturally.
4. Adapt difficulty to the student's level (${learningLevel}) based on their messages.
5. Occasionally introduce new vocabulary or expressions, explaining them briefly in ${userLanguage} within parentheses.
6. If the student writes in ${userLanguage}, gently encourage them to try in ${learningLanguage}, but still answer their question.
7. Be encouraging and supportive. Celebrate progress.
8. Mix topics: daily life, culture, travel, hobbies — whatever keeps the student engaged.
   - Since the user is a ${userProfession}, occasionally incorporate relevant professional vocabulary or scenarios if appropriate, but keep it balanced with general conversation.
9. Keep responses concise (2-4 sentences typically) to encourage back-and-forth dialogue.`,
            ],
            new MessagesPlaceholder("chat_history"),
            ["human", "{question}"],
        ]);

        const { model } =
            this.llmProviderService.createLanguageTutorLlm(modelId);
        return prompt.pipe(model).pipe(this.outputParser);
    }
}
