export default function QuickLinks() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-serif text-xl text-[#393939]">Quick Links</h3>
      <div className="flex gap-2">
        {/* Notion */}
        <a
          href="https://notion.so"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-18 h-18 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <svg
            className="w-6 h-6 text-[#393939]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Notion cube icon */}
            <path d="M4 7L4 17L8 20L8 10L4 7Z" />
            <path d="M4 7L12 3L16 6L8 10L4 7Z" />
            <path d="M8 10L16 6L16 16L8 20L8 10Z" />
            <text x="10" y="15" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">N</text>
          </svg>
        </a>

        {/* Google */}
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-12 h-12 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <span className="text-[#393939] text-xl font-bold">G</span>
        </a>

        {/* Slack */}
        <a
          href="https://slack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-12 h-12 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <svg
            className="w-5 h-5 text-[#393939]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            {/* Slack icon */}
            <circle cx="9" cy="9" r="1.5" />
            <circle cx="15" cy="9" r="1.5" />
            <circle cx="9" cy="15" r="1.5" />
            <circle cx="15" cy="15" r="1.5" />
            <rect x="11.5" y="6" width="1" height="6" rx="0.5" />
            <rect x="11.5" y="12" width="1" height="6" rx="0.5" />
            <rect x="6" y="11.5" width="6" height="1" rx="0.5" />
            <rect x="12" y="11.5" width="6" height="1" rx="0.5" />
          </svg>
        </a>
      </div>
    </div>
  )
}
