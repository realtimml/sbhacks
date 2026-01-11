import { useState } from 'react'
import { BiSend } from 'react-icons/bi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface ChatboxProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

function Chatbox({ onSend, isLoading = false }: ChatboxProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim() && !isLoading) {
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
      <div className={`flex items-center border-3 border-[#393939] rounded-2xl px-4 py-3 ${isLoading ? 'opacity-70' : ''}`}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Thinking..." : "Ask Hound anything..."}
          disabled={isLoading}
          className="flex-1 bg-transparent outline-none text-[#393939] placeholder:text-[#393939]/50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !message.trim()}
          className="ml-2 text-[#393939] hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {isLoading ? (
            <AiOutlineLoading3Quarters className="text-[#393939] w-6 h-6 animate-spin" />
          ) : (
            <BiSend className="text-[#393939] w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  )
}

export default Chatbox
