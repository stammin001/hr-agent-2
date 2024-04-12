import { ChatWindow } from "@/app/components/ChatWindow_temp";

export default function Page() {
  const InfoCard = (
    <div className="p-4 md:p-8 rounded bg-[#FFFFFF] w-full max-h-[85%] overflow-hidden">
    </div>
  );
  return (
    <ChatWindow
      endpoint="api/chats"
      titleText=""
      placeholder="Please let me know how I can help you today with your HR needs."
      emptyStateComponent={InfoCard}
    ></ChatWindow>
  );
}
