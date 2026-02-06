import ChatUI from "@/components/ChatUI";

// This is a Server Component for the Chat route
export default async function ChatPage() {
  const getStatus = async () => {
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

  const status = await getStatus();

  return (
    <main>
      <ChatUI initialStatus={status} />
    </main>
  );
}
