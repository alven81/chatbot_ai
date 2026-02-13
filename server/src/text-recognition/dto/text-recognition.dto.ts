import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class TextRecognitionRequest {
    @ApiProperty({
        type: String,
        required: true,
        description: "Base64 encoded image data (without data URI prefix)",
    })
    @IsString()
    imageBase64!: string;

    @ApiProperty({
        type: String,
        required: false,
        default: "Auto define language",
        description:
            "Language of the text to recognize (use 'Auto define language' or 'Mixed language text' for automatic detection)",
    })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiProperty({
        type: String,
        description: "Optional model ID",
        required: false,
    })
    @IsString()
    @IsOptional()
    modelId?: string;
}
