export default function TaskButton() {
    return (
      <button className="flex items-center gap-3 w-full h-[46px] px-4 mt-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2] active:bg-[#C5BDAD]">
        <svg
          className="w-6 h-6 text-[#393939] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M12 7v4M10 9h4" />
        </svg>
        <span className="font-serif text-2xl font-normal text-[#393939] leading-none">
          Tasks
        </span>
      </button>
    )
  }
  