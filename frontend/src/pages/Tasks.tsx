import { useState } from 'react'
import { RiGoogleFill, RiNotionFill, RiSlackLine, RiErrorWarningLine } from 'react-icons/ri'
import TaskItem from '../components/TaskItem'

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
        {tasks.length === 0 && (
          <p className="text-[#393939] text-center py-8">No tasks to display</p>
        )}
      </div>
    </div>
  )
}

export default Tasks
