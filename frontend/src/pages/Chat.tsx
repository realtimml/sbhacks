import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Chatbox from '../components/Chatbox';
import MessageBubble from '../components/MessageBubble';
import ConnectionStatus from '../components/connectionstatus';
import { useChat } from '../hooks/useChat';

interface LayoutContext {
  connectedCount: number;
  totalCount: number;
  openConnectionsModal: () => void;
}

function Chat() {
  const { messages, isLoading, error, sendMessage } = useChat();
  const { connectedCount, totalCount, openConnectionsModal } = useOutletContext<LayoutContext>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#3A3A38]/60">
            <p className="text-lg font-serif-caption">Start a conversation with Hound</p>
            <p className="text-sm mt-2">Ask about your emails, Slack messages, or Notion pages</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        
        {/* Error display */}
        {error && (
          <div className="mx-auto max-w-md p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
      
      {/* Chat input */}
      <Chatbox onSend={sendMessage} isLoading={isLoading} />
      
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
