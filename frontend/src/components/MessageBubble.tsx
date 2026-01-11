import type { Message } from '../lib/types';
import ToolStatusBadge from './ToolStatusBadge';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-6`}>
      {/* Sender label */}
      <span className="text-[#3A3A38] text-base font-medium font-serif-caption mb-1 px-1">
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
        {isUser ? (
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <div className="text-base leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:bg-[#3A3A38]/10 prose-pre:rounded-lg prose-code:bg-[#3A3A38]/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-[#5a4a3a] prose-a:underline prose-strong:text-[#3A3A38]">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
