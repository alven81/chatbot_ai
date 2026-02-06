import ChatUI from "@/components/ChatUI";

// This is a Server Component (no "use client" directive)
// It runs entirely on the server.
export default async function Home() {
  // You can fetch data directly from the server here
  // This will occur BEFORE the page is sent to the browser.
  // This is true Server-Side Rendering (SSR).
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
      {/* 
          We pass the server-fetched data to our Client Component.
          The HTML for ChatUI is still pre-rendered on the server, 
          but the ChatUI "hydrates" and becomes interactive in the browser.
      */}
      <ChatUI initialStatus={status} />
    </main>
  );
}
