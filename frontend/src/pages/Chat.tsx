import Chatbox from "../components/Chatbox"

function Chat() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Chat history will be implemented later */}
      </div>
      <Chatbox onSend={() => {}} />
    </div>
  )
}

export default Chat
