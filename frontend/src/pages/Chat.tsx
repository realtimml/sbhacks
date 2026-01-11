import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Chatbox from '../components/Chatbox';
import MessageBubble from '../components/MessageBubble';
import ConnectionStatus from '../components/connectionstatus';
import type { Message } from '../lib/types';

interface LayoutContext {
  connectedCount: number;
  totalCount: number;
  openConnectionsModal: () => void;
}

// Sample messages for demonstration
const sampleMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'What did Darren say on Slack today?',
  },
  {
    id: '2',
    role: 'assistant',
    content: "Here's what Darren said on Slack today...",
    toolCalls: [
      {
        id: 'tool-1',
        name: 'SLACK_SEARCH_MESSAGES',
        displayName: 'Searched Slack',
        status: 'completed',
      },
    ],
  },
];

function Chat() {
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const { connectedCount, totalCount, openConnectionsModal } = useOutletContext<LayoutContext>();

  const handleSend = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, newMessage]);
    
    // TODO: Send to backend and handle response
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      
      {/* Chat input */}
      <Chatbox onSend={handleSend} />
      
      {/* Connection status */}
      <div className="flex justify-center pb-2">
        <ConnectionStatus 
          connectedCount={connectedCount}
          totalCount={totalCount}
          onClick={openConnectionsModal}
        />
      </div>
    </div>
  );
}

export default Chat;
