import { useState } from 'react'
import { BiSend } from 'react-icons/bi';

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
    <div className="w-full px-6 pb-3">
      <div className="flex items-center border-3 border-[#393939] rounded-2xl px-4 py-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="flex-1 bg-transparent outline-none text-[#393939]"
        />
        <button
          onClick={handleSend}
          className="ml-2 text-[#393939] hover:opacity-70 transition-opacity"
          aria-label="Send message"
        >
          <BiSend className="text-[#393939] w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

export default Chatbox
