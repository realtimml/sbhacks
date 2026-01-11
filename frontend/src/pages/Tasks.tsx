import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { RiNotionFill, RiSlackLine, RiLoader4Line, RiAlertLine, RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri'
import { BiLogoGmail } from 'react-icons/bi'
import TaskItem from '../components/TaskItem'
import { useProposals } from '../hooks/useProposals'
import { getNotionSettings, executeProposal, dismissProposal } from '../lib/api'
import type { TaskProposal } from '../lib/types'

interface LayoutContext {
  connectedCount: number;
  totalCount: number;
  openConnectionsModal: () => void;
  isLoading: boolean;
}

// Priority badge colors and icons
const priorityConfig = {
  high: { label: 'High', icon: <RiArrowUpLine className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
  medium: { label: 'Medium', icon: <RiAlertLine className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low', icon: <RiArrowDownLine className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
}

// Source icons
const sourceIcons = {
  slack: <RiSlackLine className="w-4 h-4" />,
  gmail: <BiLogoGmail className="w-4 h-4" />,
}

// Format date for display
function formatDueDate(dateStr?: string): string {
  if (!dateStr) return 'No due date'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Convert proposal to TaskItem sources array
function buildSources(proposal: TaskProposal) {
  const sources: { name: string; icon?: React.ReactNode; type: 'primary' | 'priority' }[] = []
  
  // Add source (Slack/Gmail)
  const sourceName = proposal.source.charAt(0).toUpperCase() + proposal.source.slice(1)
  sources.push({
    name: sourceName,
    icon: sourceIcons[proposal.source],
    type: 'primary',
  })
  
  // Add priority badge
  const priority = priorityConfig[proposal.priority]
  sources.push({
    name: priority.label,
    icon: priority.icon,
    type: 'priority',
  })
  
  return sources
}

function Tasks() {
  const { openConnectionsModal } = useOutletContext<LayoutContext>()
  const [hasNotionDatabase, setHasNotionDatabase] = useState(false)
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set())
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set())
  const { proposals, isLoading: proposalsLoading, removeProposal } = useProposals()

  // Check if user has selected a Notion database
  const checkNotionSettings = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Tasks.tsx:65',message:'checkNotionSettings called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const settings = await getNotionSettings()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Tasks.tsx:68',message:'getNotionSettings returned',data:{settings:settings,hasDbId:!!settings?.database_id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setHasNotionDatabase(!!settings?.database_id)
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Tasks.tsx:72',message:'checkNotionSettings error',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('Failed to check Notion settings:', err)
    }
  }

  // Check on mount
  useEffect(() => {
    checkNotionSettings()
  }, [])

  // Re-check when window regains focus (after modal closes)
  useEffect(() => {
    const handleFocus = () => {
      checkNotionSettings()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Handle dismissing a proposal
  const handleDismiss = async (proposalId: string) => {
    try {
      await dismissProposal(proposalId)
      removeProposal(proposalId)
    } catch (err) {
      console.error('Failed to dismiss proposal:', err)
    }
  }

  // Handle adding proposal to Notion
  const handleAddToNotion = async (proposalId: string) => {
    if (!hasNotionDatabase) {
      alert('Please select a Notion database first in the Connections settings.')
      return
    }

    setExecutingIds(prev => new Set(prev).add(proposalId))
    
    try {
      const result = await executeProposal(proposalId)
      
      if (result.success) {
        setSuccessIds(prev => new Set(prev).add(proposalId))
        // Remove from list after showing success briefly
        setTimeout(() => {
          removeProposal(proposalId)
          setSuccessIds(prev => {
            const next = new Set(prev)
            next.delete(proposalId)
            return next
          })
        }, 1500)
      } else {
        alert(result.error || 'Failed to add task to Notion')
      }
    } catch (err) {
      console.error('Failed to execute proposal:', err)
      alert('Failed to add task to Notion')
    } finally {
      setExecutingIds(prev => {
        const next = new Set(prev)
        next.delete(proposalId)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <h1 className="font-serif text-3xl text-[#393939]">Tasks</h1>
      
      {/* Notion database warning */}
      {!hasNotionDatabase && (
        <div className="flex items-center gap-2 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <RiAlertLine className="w-5 h-5 flex-shrink-0" />
          <span>
            Connect and select a Notion database in{' '}
            <button 
              onClick={openConnectionsModal}
              className="underline hover:text-amber-900 font-medium"
            >
              Settings
            </button>
            {' '}to approve tasks.
          </span>
        </div>
      )}
      
      {/* Divider */}
      <div className="w-full h-px bg-[#C5BDAD] mt-4 mb-6" />
      
      {/* Task items area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6">
        {/* Loading state */}
        {proposalsLoading && (
          <div className="flex items-center justify-center py-8">
            <RiLoader4Line className="w-6 h-6 animate-spin text-[#666]" />
          </div>
        )}

        {/* Task proposals displayed as TaskItems */}
        {!proposalsLoading && proposals.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-serif text-xl text-[#393939]">Detected Tasks</h2>
              <span className="bg-[#8EB879] text-white text-xs px-2 py-0.5 rounded-full">
                {proposals.length}
              </span>
            </div>
            
            {proposals.map((proposal) => {
              const isExecuting = executingIds.has(proposal.proposal_id)
              const isSuccess = successIds.has(proposal.proposal_id)
              
              // Show success state
              if (isSuccess) {
                return (
                  <div key={proposal.proposal_id} className="bg-[#E8F5E3] border-2 border-[#8EB879] rounded-2xl p-5 transition-all">
                    <div className="flex items-center gap-3 text-[#4A7A3A]">
                      <RiNotionFill className="w-6 h-6" />
                      <span className="font-medium">Task added to Notion!</span>
                    </div>
                  </div>
                )
              }
              
              return (
                <TaskItem
                  key={proposal.proposal_id}
                  id={proposal.proposal_id}
                  title={proposal.title}
                  dueDate={formatDueDate(proposal.due_date)}
                  confidence={Math.round(proposal.confidence * 100)}
                  sources={buildSources(proposal)}
                  description={proposal.description || proposal.source_context.original_content.slice(0, 200) + '...'}
                  actionLabel={isExecuting ? 'Adding...' : 'Add to Notion'}
                  actionIcon={isExecuting ? <RiLoader4Line className="w-5 h-5 animate-spin" /> : <RiNotionFill className="w-5 h-5" />}
                  detectionReason={proposal.reasoning}
                  onAction={() => handleAddToNotion(proposal.proposal_id)}
                  onDismiss={handleDismiss}
                />
              )
            })}
          </>
        )}
        
        {/* Empty state */}
        {!proposalsLoading && proposals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RiSlackLine className="w-12 h-12 text-[#C5BDAD] mb-4" />
            <p className="text-[#393939] text-lg font-medium mb-2">No tasks detected yet</p>
            <p className="text-[#666] text-sm max-w-md">
              When someone mentions you on Slack with an actionable task, it will appear here for your review.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Tasks
