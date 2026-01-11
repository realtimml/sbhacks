import { useState } from 'react'
import { RiCloseLine, RiTimeLine, RiSparklingLine, RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri'

interface Source {
  name: string
  icon?: React.ReactNode
  type: 'primary' | 'priority'
}

interface TaskItemProps {
  id: string
  title: string
  dueDate: string
  confidence: number
  sources: Source[]
  description: string
  actionLabel: string
  actionIcon?: React.ReactNode
  detectionReason: string
  onAction: () => void
  onDismiss: (id: string) => void
}

export default function TaskItem({
  id,
  title,
  dueDate,
  confidence,
  sources,
  description,
  actionLabel,
  actionIcon,
  detectionReason,
  onAction,
  onDismiss,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="flex flex-col">
      {/* Header row with title and close button */}
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-2xl text-[#393939]">{title}</h2>
        <button
          onClick={() => onDismiss(id)}
          className="text-[#393939] hover:opacity-70 transition-opacity p-1"
          aria-label="Dismiss task"
        >
          <RiCloseLine className="w-6 h-6" />
        </button>
      </div>

      {/* Meta info row: due date and confidence */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1 text-[#393939]">
          <RiTimeLine className="w-4 h-4" />
          <span className="text-sm">Due {dueDate}</span>
        </div>
        <div className="flex items-center gap-1 text-[#393939]">
          <RiSparklingLine className="w-4 h-4" />
          <span className="text-sm">{confidence}%</span>
        </div>
      </div>

      {/* Source badges */}
      <div className="flex items-center gap-2 mt-3">
        {sources.map((source, index) => (
          <span
            key={index}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
              source.type === 'priority'
                ? 'bg-[#E8E589] text-[#393939]'
                : 'border border-[#C5BDAD] text-[#393939]'
            }`}
          >
            {source.icon}
            {source.name}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-[#393939] mt-4 leading-relaxed">{description}</p>

      {/* Action button row */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-4 py-2 bg-[#CBDCEB] rounded-lg text-[#393939] hover:bg-[#EBE5DC] transition-colors"
        >
          {actionIcon}
          <span>{actionLabel}</span>
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center w-10 h-10 bg-[#3939391A] rounded-lg text-[#393939] hover:bg-[#EBE5DC] transition-colors"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? (
            <RiArrowUpSLine className="w-5 h-5" />
          ) : (
            <RiArrowDownSLine className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Detection reason (collapsible) */}
      {isExpanded && (
        <p className="text-[#393939] mt-4">
          <span className="font-bold">Why was this detected?</span>
          <span> - {detectionReason}</span>
        </p>
      )}

      {/* Divider */}
      <div className="w-full h-px bg-[#C5BDAD] mt-6" />
    </div>
  )
}
