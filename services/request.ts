export const getStatus = async () => {
    try {
        const resp = await fetch(`http://localhost:3001/api/health`, {
            cache: "no-store",
        });
        const data = await resp.json();
        return {
            llm: data.llm || "AI",
            serverTimestamp: new Date().toISOString(),
        };
    } catch (e) {
        return { llm: "Unknown", serverTimestamp: null };
    }
};

export interface ImageProcessingRequest {
    imageBase64: string;
    styleDescription: string;
    aspectRatio?: string;
    style?: string;
    lighting?: string;
    quality?: string;
}

export const processImage = async (
    request: ImageProcessingRequest
): Promise<{ resultBase64: string }> => {
    try {
        const response = await fetch(
            "http://localhost:3001/api/image-processing/process",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            }
        );

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
