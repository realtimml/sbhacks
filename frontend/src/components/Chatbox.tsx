import { useState } from 'react'

interface ChatboxProps {
  onSend: (message: string) => void;
}

function Chatbox({ onSend }: ChatboxProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full px-6 pb-6">
      <div className="flex items-center border-3 border-[#3A3A38] rounded-full px-4 py-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="flex-1 bg-transparent outline-none text-[#3A3A38]"
        />
        <button
          onClick={handleSend}
          className="ml-2 text-[#3A3A38] hover:opacity-70 transition-opacity"
          aria-label="Send message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default Chatbox
