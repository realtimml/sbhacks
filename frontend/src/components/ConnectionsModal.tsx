import { useEffect } from 'react';
import { BiLogoGmail } from 'react-icons/bi';
import { RiAddLargeLine, RiNotionLine, RiSlackLine } from 'react-icons/ri';
import NotionDatabasePicker from './NotionDatabasePicker';

interface Connection {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
}

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: Connection[];
  onConnect: (connectionId: string) => void;
}

export default function ConnectionsModal({ 
  isOpen, 
  onClose, 
  connections,
  onConnect 
}: ConnectionsModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const notionConnection = connections.find(c => c.id === 'notion');
  const isNotionConnected = notionConnection?.connected ?? false;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[#E8E4DC] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h2 className="font-serif text-3xl text-[#3A3A38]">Connections</h2>
            <div className="w-full h-px bg-[#C5BDAD] mt-4" />
          </div>

          {/* Connection buttons */}
          <div className="px-8 pb-6 space-y-3">
            {connections.map((connection) => (
              <button
                key={connection.id}
                onClick={() => onConnect(connection.id)}
                className="flex items-center justify-between w-full px-5 py-4 border-2 border-[#3A3A38] rounded-full hover:bg-[#D5CDBD] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Service icon */}
                  <div className="w-6 h-6 text-[#3A3A38]">
                    {connection.icon}
                  </div>
                  {/* Service name */}
                  <span className="text-[#3A3A38] text-lg font-medium">
                    {connection.name}
                  </span>
                </div>
                
                {/* Connection status */}
                {connection.connected ? (
                  <div className="w-3 h-3 rounded-full bg-[#8EB879]" />
                ) : (
                  <RiAddLargeLine className="text-[#393939] w-6 h-6" />
                )}
              </button>
            ))}
          </div>

          {/* Notion Database Picker - shown when Notion is connected */}
          {isNotionConnected && (
            <div className="px-8 pb-8">
              <div className="w-full h-px bg-[#C5BDAD] mb-4" />
              <h3 className="font-serif text-xl text-[#3A3A38] mb-2">Notion Settings</h3>
              <p className="text-sm text-[#666] mb-3">
                Select the database where approved tasks will be saved.
              </p>
              <NotionDatabasePicker isConnected={isNotionConnected} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Service icons
export const SlackIcon = () => (
  <RiSlackLine className="text-[#393939] w-6 h-6" />
);

export const GmailIcon = () => (
  <BiLogoGmail className="text-[#393939] w-6 h-6" />
);

export const NotionIcon = () => (
  <RiNotionLine className="text-[#393939] w-6 h-6" />
);
