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
