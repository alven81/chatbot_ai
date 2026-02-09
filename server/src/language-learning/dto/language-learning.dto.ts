import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class LanguageLearningRequest {
    @ApiProperty({
        type: String,
        required: true,
        description: "The message to send to the language tutor",
    })
    @IsString()
    message!: string;

    @ApiProperty({
        type: String,
        description: "Optional session ID for chat history",
        required: false,
    })
    @IsOptional()
    @IsString()
    sessionId?: string;

    @ApiProperty({
        type: String,
        required: true,
        description: "The language the user is learning (e.g. Spanish, French)",
    })
    @IsString()
    learningLanguage!: string;

    @ApiProperty({
        type: String,
        required: true,
        description: "The user's native language (e.g. English)",
    })
    @IsString()
    userLanguage!: string;

    @ApiProperty({
        type: String,
        description: "The user's proficiency level (A1, A2, B1, B2, C1, C2)",
        required: false,
        default: "A1",
    })
    @IsOptional()
    @IsString()
    learningLevel?: string;

    @ApiProperty({
        type: String,
        description: "The user's profession (e.g. IT Engineer, Doctor, etc.)",
        required: false,
        default: "General",
    })
    @IsOptional()
    @IsString()
    userProfession?: string;
}

export class LanguageLearningClearRequest {
    @ApiProperty({
        type: String,
        description: "Optional session ID to clear history for",
        required: false,
    })
    @IsOptional()
    @IsString()
    sessionId?: string;
}
