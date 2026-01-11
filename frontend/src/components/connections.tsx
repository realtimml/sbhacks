import { BiLogoGmail } from "react-icons/bi";
import { RiNotionLine, RiSlackLine } from "react-icons/ri";

interface Connection {
  id: string;
  name: string;
  connected: boolean;
}

interface QuickLinksProps {
  connections: Connection[];
}

export default function QuickLinks({ connections }: QuickLinksProps) {
  const isConnected = (id: string) => connections.find(c => c.id === id)?.connected ?? false;

  return (
    <div className="flex flex-col gap-3 mb-6">
      <h3 className="font-serif text-xl text-[#393939]">Connections</h3>
      <div className="flex gap-2">
        {/* Notion */}
        <a
          href="https://notion.so"
          target="_blank"
          rel="noopener noreferrer"
          title="Notion"
          className="relative flex items-center justify-center w-18 h-15 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <RiNotionLine className="text-[#393939] w-6 h-6" />
          <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${isConnected('notion') ? 'bg-[#8EB879]' : 'bg-[#e57758]'}`} />
        </a>

        {/* Google */}
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Gmail"
          className="relative flex items-center justify-center w-18 h-15 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <BiLogoGmail className="text-[#393939] w-6 h-6" />
          <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${isConnected('gmail') ? 'bg-[#8EB879]' : 'bg-[#e57758]'}`} />
        </a>

        {/* Slack */}
        <a
          href="https://slack.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Slack"
          className="relative flex items-center justify-center w-18 h-15 bg-[#D5CDBD] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#CAC2B2]"
        >
          <RiSlackLine className="text-[#393939] w-6 h-6" />
          <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${isConnected('slack') ? 'bg-[#8EB879]' : 'bg-[#e57758]'}`} />
        </a>
      </div>
    </div>
  )
}
