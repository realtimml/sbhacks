import { useState, useEffect } from 'react'
import { RiGoogleFill, RiNotionFill, RiSlackLine, RiErrorWarningLine, RiLoader4Line } from 'react-icons/ri'
import TaskItem from '../components/TaskItem'
import ProposalCard from '../components/ProposalCard'
import { useProposals } from '../hooks/useProposals'
import { getNotionSettings } from '../lib/api'

interface Task {
  id: string
  title: string
  dueDate: string
  confidence: number
  sources: { name: string; icon?: React.ReactNode; type: 'primary' | 'priority' }[]
  description: string
  actionLabel: string
  actionIcon?: React.ReactNode
  detectionReason: string
}

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Apply to Diamondhacks 2026',
    dueDate: 'April 4, 2026',
    confidence: 96,
    sources: [
      { name: 'Gmail', icon: <RiGoogleFill className="w-4 h-4" />, type: 'primary' },
      { name: 'Medium', icon: <RiErrorWarningLine className="w-4 h-4" />, type: 'priority' },
    ],
    description: "The application for DiamondHacks 2026 is open. The recipient's application will receive priority consideration...",
    actionLabel: 'Add to Notion',
    actionIcon: <RiNotionFill className="w-5 h-5" />,
    detectionReason: 'The email explicitly states that applications are live and provides a link to apply, implying an action is needed.',
  },
  {
    id: '2',
    title: 'Submit quarterly report',
    dueDate: 'March 15, 2026',
    confidence: 89,
    sources: [
      { name: 'Slack', icon: <RiSlackLine className="w-4 h-4" />, type: 'primary' },
    ],
    description: "Reminder from your manager: Please submit the Q1 quarterly report by end of week. Include metrics and KPIs.",
    actionLabel: 'Add to Notion',
    actionIcon: <RiNotionFill className="w-5 h-5" />,
    detectionReason: 'Message from manager mentions a deadline and specific deliverable that requires action.',
  },
  {
    id: '3',
    title: 'Schedule dentist appointment',
    dueDate: 'March 20, 2026',
    confidence: 72,
    sources: [
      { name: 'Gmail', icon: <RiGoogleFill className="w-4 h-4" />, type: 'primary' },
    ],
    description: "Your 6-month dental checkup is due. Please call to schedule your appointment at your earliest convenience.",
    actionLabel: 'Add to Notion',
    actionIcon: <RiNotionFill className="w-5 h-5" />,
    detectionReason: 'Email from dental office suggests scheduling an appointment, indicating a personal task.',
  },
]

function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks)
  const [hasNotionDatabase, setHasNotionDatabase] = useState(false)
  const { proposals, isLoading: proposalsLoading, removeProposal } = useProposals()

  // Check if user has selected a Notion database
  useEffect(() => {
    const checkNotionSettings = async () => {
      try {
        const settings = await getNotionSettings()
        setHasNotionDatabase(!!settings?.database_id)
      } catch (err) {
        console.error('Failed to check Notion settings:', err)
      }
    }
    checkNotionSettings()
  }, [])

  const handleDismiss = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  const handleAction = (taskId: string) => {
    // TODO: Implement action (e.g., add to Notion)
    console.log('Action triggered for task:', taskId)
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <h1 className="font-serif text-3xl text-[#393939]">Tasks</h1>
      
      {/* Divider */}
      <div className="w-full h-px bg-[#C5BDAD] mt-4 mb-6" />
      
      {/* Task items area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6">
        {/* Pending Proposals Section */}
        {(proposalsLoading || proposals.length > 0) && (
          <div className="mb-4">
            <h2 className="font-serif text-xl text-[#393939] mb-4 flex items-center gap-2">
              Pending Proposals
              {proposals.length > 0 && (
                <span className="bg-[#8EB879] text-white text-xs px-2 py-0.5 rounded-full">
                  {proposals.length}
                </span>
              )}
            </h2>
            
            {proposalsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RiLoader4Line className="w-6 h-6 animate-spin text-[#666]" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.proposal_id}
                    proposal={proposal}
                    hasNotionDatabase={hasNotionDatabase}
                    onDismiss={removeProposal}
                    onExecute={removeProposal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider between proposals and tasks */}
        {proposals.length > 0 && tasks.length > 0 && (
          <div className="w-full h-px bg-[#C5BDAD] my-2" />
        )}

        {/* Sample Tasks Section */}
        {tasks.length > 0 && (
          <>
            <h2 className="font-serif text-xl text-[#393939] mb-2">Sample Tasks</h2>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                dueDate={task.dueDate}
                confidence={task.confidence}
                sources={task.sources}
                description={task.description}
                actionLabel={task.actionLabel}
                actionIcon={task.actionIcon}
                detectionReason={task.detectionReason}
                onAction={() => handleAction(task.id)}
                onDismiss={handleDismiss}
              />
            ))}
          </>
        )}
        
        {tasks.length === 0 && proposals.length === 0 && !proposalsLoading && (
          <p className="text-[#393939] text-center py-8">No tasks to display</p>
        )}
      </div>
    </div>
  )
}

export default Tasks
