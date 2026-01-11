export default function Logo() {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <svg
        className="w-8 h-8 text-[#393939] shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dog/hound head profile facing right with pointed ear */}
        <path d="M4 17 C2 14, 3 10, 6 7 L9 2 L13 5 L9 9 C12 9, 16 11, 19 14 C21 17, 20 20, 17 21 C13 22, 8 21, 4 17 Z" />
      </svg>
      <span className="font-serif text-[28px] font-normal text-[#393939] leading-none tracking-tight">
        hound.ai
      </span>
    </div>
  )
}
