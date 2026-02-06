import ChatUI from "@/components/ChatUI";
import { getStatus } from "@/services/request";

// Server Component for the Chat route
const ChatPage = async () => {
  const status = await getStatus();

  return (
    <main>
      <ChatUI initialStatus={status} />
    </main>
  );
};

export default ChatPage;
