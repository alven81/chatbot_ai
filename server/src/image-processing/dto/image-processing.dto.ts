import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, IsNumber } from "class-validator";

export enum AspectRatio {
    THREE_FOUR = "3:4", // Better for full head + torso
    TWO_THREE = "2:3", // Better for full head + torso
}

export enum LightingStyle {
    CINEMATIC = "cinematic",
    MOODY = "moody",
    NATURAL = "natural",
    STUDIO = "studio",
}

export class ImageProcessingRequest {
    @ApiProperty({
        type: String,
        required: true,
        description: "Base64 encoded image data (without data URI prefix)",
    })
    @IsString()
    imageBase64!: string;

    @ApiProperty({
        type: String,
        required: true,
        description:
            "Description of the clothing style to apply (e.g. 'formal business suit', 'casual streetwear')",
    })
    @IsString()
    styleDescription!: string;

    @ApiProperty({
        enum: AspectRatio,
        required: false,
        default: AspectRatio.THREE_FOUR,
        description: "Aspect ratio - 3:4 or 2:3 for full head + torso",
    })
    @IsEnum(AspectRatio)
    @IsOptional()
    aspectRatio?: AspectRatio;

    @ApiProperty({
        type: String,
        required: false,
        default: "photorealistic",
        description: "Photography style (photorealistic, artistic, etc.)",
    })
    @IsString()
    @IsOptional()
    style?: string;

    @ApiProperty({
        enum: LightingStyle,
        required: false,
        default: LightingStyle.CINEMATIC,
        description: "Lighting style (cinematic, moody, natural, studio)",
    })
    @IsEnum(LightingStyle)
    @IsOptional()
    lighting?: LightingStyle;

    @ApiProperty({
        type: String,
        required: false,
        default: "high",
        description: "Quality/detail level (low, medium, high, ultra)",
    })
    @IsString()
    @IsOptional()
    quality?: string;

    @ApiProperty({
        type: Number,
        required: false,
        description: "Random seed for consistency across retries (optional)",
    })
    @IsNumber()
    @IsOptional()
    seed?: number;
}
