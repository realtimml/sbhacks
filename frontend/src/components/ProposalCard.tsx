import { useState } from 'react';
import { RiSlackLine, RiCheckLine, RiCloseLine, RiLoader4Line, RiAlertLine } from 'react-icons/ri';
import { BiLogoGmail } from 'react-icons/bi';
import { dismissProposal, executeProposal } from '../lib/api';
import type { TaskProposal } from '../lib/types';

interface ProposalCardProps {
  proposal: TaskProposal;
  onDismiss: (proposalId: string) => void;
  onExecute: (proposalId: string) => void;
  hasNotionDatabase: boolean;
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const sourceIcons = {
  slack: <RiSlackLine className="w-4 h-4" />,
  gmail: <BiLogoGmail className="w-4 h-4" />,
};

export default function ProposalCard({ 
  proposal, 
  onDismiss, 
  onExecute,
  hasNotionDatabase 
}: ProposalCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleApprove = async () => {
    if (!hasNotionDatabase) {
      setError('Please select a Notion database first');
      return;
    }

    setIsApproving(true);
    setError(null);

    const result = await executeProposal(proposal.proposal_id);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onExecute(proposal.proposal_id);
      }, 1000);
    } else {
      setError(result.error || 'Failed to create task');
      setIsApproving(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    setError(null);

    try {
      await dismissProposal(proposal.proposal_id);
      onDismiss(proposal.proposal_id);
    } catch (err) {
      setError('Failed to dismiss proposal');
      setIsDismissing(false);
    }
  };

  // Format the date
  const formattedDate = new Date(proposal.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // Confidence percentage
  const confidencePercent = Math.round(proposal.confidence * 100);

  if (success) {
    return (
      <div className="bg-[#E8F5E3] border-2 border-[#8EB879] rounded-2xl p-5 transition-all">
        <div className="flex items-center gap-3 text-[#4A7A3A]">
          <RiCheckLine className="w-6 h-6" />
          <span className="font-medium">Task created in Notion!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5EFE6] border-2 border-[#C5BDAD] rounded-2xl p-5 transition-all hover:border-[#3A3A38]">
      {/* Header: Source & Priority */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Source badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E8E4DC] rounded-full text-xs font-medium text-[#3A3A38]">
            {sourceIcons[proposal.source]}
            {proposal.source.charAt(0).toUpperCase() + proposal.source.slice(1)}
          </span>
          
          {/* Priority badge */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColors[proposal.priority]}`}>
            {proposal.priority.charAt(0).toUpperCase() + proposal.priority.slice(1)}
          </span>
        </div>

        {/* Confidence */}
        <span className="text-xs text-[#666]">
          {confidencePercent}% confidence
        </span>
      </div>

      {/* Title */}
      <h3 className="font-serif text-lg text-[#3A3A38] mb-2">
        {proposal.title}
      </h3>

      {/* Description */}
      {proposal.description && (
        <p className="text-sm text-[#666] mb-3 line-clamp-2">
          {proposal.description}
        </p>
      )}

      {/* Source context */}
      <div className="text-xs text-[#888] mb-4">
        From: {proposal.source_context.sender} • {formattedDate}
      </div>

      {/* No database warning */}
      {!hasNotionDatabase && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-sm text-amber-700">
          <RiAlertLine className="w-4 h-4 flex-shrink-0" />
          <span>Select a Notion database to approve tasks</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
          <RiAlertLine className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Approve button */}
        <button
          onClick={handleApprove}
          disabled={isApproving || isDismissing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8EB879] hover:bg-[#7DA86A] text-white rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <RiLoader4Line className="w-5 h-5 animate-spin" />
          ) : (
            <RiCheckLine className="w-5 h-5" />
          )}
          {isApproving ? 'Creating...' : 'Approve'}
        </button>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          disabled={isApproving || isDismissing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-[#C5BDAD] hover:border-[#3A3A38] text-[#3A3A38] rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDismissing ? (
            <RiLoader4Line className="w-5 h-5 animate-spin" />
          ) : (
            <RiCloseLine className="w-5 h-5" />
          )}
          Dismiss
        </button>
      </div>

      {/* Reasoning (expandable) */}
      <details className="mt-4">
        <summary className="text-xs text-[#888] cursor-pointer hover:text-[#666]">
          Why this was suggested
        </summary>
        <p className="mt-2 text-xs text-[#666] bg-[#E8E4DC] p-3 rounded-lg">
          {proposal.reasoning}
        </p>
      </details>
    </div>
  );
}

