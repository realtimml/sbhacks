import type { Message } from '../lib/types';
import ToolStatusBadge from './ToolStatusBadge';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-6`}>
      {/* Sender label */}
      <span className="text-[#3A3A38] text-base font-medium mb-1 px-1">
        {isUser ? 'You' : 'Hound'}
      </span>

      {/* Tool status badges (only for assistant messages) */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {message.toolCalls.map((tool) => (
            <ToolStatusBadge 
              key={tool.id} 
              name={tool.displayName || tool.name} 
              status={tool.status} 
            />
          ))}
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl ${
          isUser
            ? 'bg-[#C5BDAD] text-[#3A3A38]'
            : 'bg-[#D5CDBD] text-[#3A3A38]'
        }`}
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}
