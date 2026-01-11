import { BiLogoGmail } from "react-icons/bi";
import { RiNotionLine, RiSlackLine } from "react-icons/ri";

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
          className="flex items-center justify-center w-18 h-8 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <RiNotionLine className="text-[#393939] w-6 h-6" />
        </a>

        {/* Google */}
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-18 h-8 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <BiLogoGmail className="text-[#393939] w-6 h-6" />
        </a>

        {/* Slack */}
        <a
          href="https://slack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-18 h-8 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <RiSlackLine className="text-[#393939] w-6 h-6" />
        </a>
      </div>
    </div>
  )
}
