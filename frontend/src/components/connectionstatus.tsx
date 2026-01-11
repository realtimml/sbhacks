interface ConnectionStatusProps {
  connectedCount: number;
  totalCount?: number;
  onClick?: () => void;
}

export default function ConnectionStatus({ 
  connectedCount, 
  totalCount = 3,
  onClick
}: ConnectionStatusProps) {
  const isFullyConnected = connectedCount >= totalCount;
  
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 h-6 px-4 bg-transparent cursor-pointer transition-all duration-200 hover:opacity-70"
    >
      {/* Status indicator dot */}
      <div 
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          isFullyConnected ? 'bg-[#8EB879]' : 'bg-[#e57758]'
        }`}
      />
      {/* Connection text */}
      <span className="text-[#393939] text-sm font-regular">
        {connectedCount} Connection{connectedCount !== 1 ? 's' : ''}
      </span>
    </button>
  )
}
