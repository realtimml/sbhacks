interface ToolStatusBadgeProps {
  name: string;
  status: 'pending' | 'completed' | 'error';
}

export default function ToolStatusBadge({ name, status }: ToolStatusBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C5DCF0] rounded-full text-[#2B5F8E] text-sm font-medium">
      {status === 'completed' && (
        <svg 
          className="w-4 h-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {status === 'pending' && (
        <svg 
          className="w-4 h-4 animate-spin" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      )}
      {status === 'error' && (
        <svg 
          className="w-4 h-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      <span>{name}</span>
    </div>
  );
}
