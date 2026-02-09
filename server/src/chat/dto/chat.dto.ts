import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ChatRequest {
    @ApiProperty({
        type: String,
        required: true,
        description: "The message to send to the AI",
    })
    @IsString()
    message!: string;

    @ApiProperty({
        type: String,
        description: "Optional session ID for chat history",
        required: false,
    })
    @IsString()
    sessionId?: string;
}

export class ClearRequest {
    @ApiProperty({
        type: String,
        description: "Optional session ID to clear history for",
        required: false,
    })
    @IsString()
    sessionId?: string;
}
