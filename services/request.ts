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
