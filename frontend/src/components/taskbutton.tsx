import { NavLink } from 'react-router-dom'
import { RiNotification3Line } from "react-icons/ri"

export default function TaskButton() {
  return (
    <NavLink 
      to="/tasks" 
      className={({ isActive }) => 
        `flex items-center gap-3 w-full h-[35px] px-2 mt-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2] active:bg-[#C5BDAD] ${isActive ? 'bg-[#D5CDBD]' : ''}`
      }
    >
      <RiNotification3Line className="text-[#393939] w-6 h-6" />
      <span className="font-serif text-xl font-normal text-[#393939] leading-none">
        Tasks
      </span>
    </NavLink>
  )
}
