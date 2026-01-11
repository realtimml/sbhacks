import { RiCheckLine, RiErrorWarningLine, RiLoader3Fill } from "react-icons/ri";

interface ToolStatusBadgeProps {
  name: string;
  status: 'pending' | 'completed' | 'error';
}

export default function ToolStatusBadge({ name, status }: ToolStatusBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C5DCF0] rounded-full text-[#2B5F8E] text-sm font-medium">
      {status === 'completed' && (
        <RiCheckLine className="text-[#2B5F8E] w-4 h-4" />
      )}
      {status === 'pending' && (
        <RiLoader3Fill className="text-[#2B5F8E] w-4 h-4 animate-spin" />
      )}
      {status === 'error' && (
        <RiErrorWarningLine className="text-[#2B5F8E] w-4 h-4" />
      )}
      <span>{name}</span>
    </div>
  );
}
