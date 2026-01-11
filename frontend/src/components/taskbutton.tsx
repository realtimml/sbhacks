import { NavLink } from 'react-router-dom'
import { RiNotification3Line } from "react-icons/ri"
import { useProposalCount } from '../hooks/useProposals'

export default function TaskButton() {
  const { count } = useProposalCount()

  return (
    <NavLink 
      to="/tasks" 
      className={({ isActive }) => 
        `flex items-center gap-3 w-full h-[35px] px-2 mt-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2] active:bg-[#C5BDAD] ${isActive ? 'bg-[#D5CDBD]' : ''}`
      }
    >
      <div className="relative">
        <RiNotification3Line className="text-[#393939] w-6 h-6" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#8EB879] text-white text-[10px] font-medium min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </div>
      <span className="font-serif text-xl font-normal text-[#393939] leading-none">
        Tasks
      </span>
    </NavLink>
  )
}
