interface ConnectionStatusProps {
  connectedCount: number;
  totalCount?: number;
}

export default function ConnectionStatus({ 
  connectedCount, 
  totalCount = 3 
}: ConnectionStatusProps) {
  const isFullyConnected = connectedCount >= totalCount;
  
  return (
    <div className="flex items-center justify-between w-full h-10 px-4 bg-[#D5CDBD] rounded-full cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2] mb-4">
      {/* Connection text */}
      <span className="text-[#393939] text-sm font-regular">
        {connectedCount} Connection{connectedCount !== 1 ? 's' : ''}
      </span>
      {/* Status indicator dot */}
      <div 
        className={`w-3 h-3 rounded-full shrink-0 ${
          isFullyConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
    </div>
  )
}
