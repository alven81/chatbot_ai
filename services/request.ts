import { API_URL } from "./routes";

export interface ILlmModel {
    id: string;
    name: string;
    provider: string;
    isImageCapable?: boolean;
    isImageOnly?: boolean;
}

export interface HealthStatus {
    platform: string;
    llm: string;
    availableModels?: ILlmModel[];
    serverTimestamp?: string | null;
}

export const getStatus = async () => {
    try {
        const resp = await fetch(`${API_URL}/chat/health`, {
            cache: "no-store",
        });
        const data = await resp.json();
        return {
            llm: data.llm || "AI",
            platform: data.platform || "Unknown",
            availableModels: data.availableModels || [],
            serverTimestamp: new Date().toISOString(),
        };
    } catch (e) {
        return { llm: "Unknown", platform: "Unknown", serverTimestamp: null };
    }
};

export const getChatHealth = async (): Promise<HealthStatus> => {
    try {
        const resp = await fetch(`${API_URL}/chat/health`, {
            cache: "no-store",
        });
        return await resp.json();
    } catch (e) {
        return { platform: "Unknown", llm: "Unknown" };
    }
};

export const getImageHealth = async (): Promise<HealthStatus> => {
    try {
        const resp = await fetch(`${API_URL}/image-processing/health`, {
            cache: "no-store",
        });
        return await resp.json();
    } catch (e) {
        return { platform: "Unknown", llm: "Unknown" };
    }
};

export const getLanguageHealth = async (): Promise<HealthStatus> => {
    try {
        const resp = await fetch(`${API_URL}/language-learning/health`, {
            cache: "no-store",
        });
        return await resp.json();
    } catch (e) {
        return { platform: "Unknown", llm: "Unknown" };
    }
};

export interface ImageProcessingRequest {
    imageBase64: string;
    styleDescription: string;
    aspectRatio?: string;
    style?: string;
    lighting?: string;
    quality?: string;
    modelId?: string;
}

export const processImage = async (
    request: ImageProcessingRequest
): Promise<{ resultBase64: string }> => {
    try {
        const response = await fetch(`${API_URL}/image-processing/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.message || `Processing failed (${response.status})`
            );
        }

        const data = await response.json();
        return data;
    } catch (error: any) {
        throw new Error(error.message || "Failed to process image");
    }
};
