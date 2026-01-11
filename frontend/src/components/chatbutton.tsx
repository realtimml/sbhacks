import { RiChat2Line } from "react-icons/ri";

export default function ChatButton() {
  return (
    <button className="flex items-center gap-3 w-full h-[35px] px-2 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2] active:bg-[#C5BDAD]">
      <RiChat2Line className="text-[#393939] w-6 h-6" />
      <span className="font-serif text-xl font-normal text-[#393939] leading-none">
        Chat
      </span>
    </button>
  )
}
