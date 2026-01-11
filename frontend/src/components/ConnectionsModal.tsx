import { useEffect } from 'react';

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
          <div className="px-8 pb-8 space-y-3">
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
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                ) : (
                  <svg 
                    className="w-5 h-5 text-[#3A3A38]" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Service icons
export const SlackIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="9" r="1.5" />
    <circle cx="15" cy="9" r="1.5" />
    <circle cx="9" cy="15" r="1.5" />
    <circle cx="15" cy="15" r="1.5" />
    <rect x="11.5" y="6" width="1" height="6" rx="0.5" />
    <rect x="11.5" y="12" width="1" height="6" rx="0.5" />
    <rect x="6" y="11.5" width="6" height="1" rx="0.5" />
    <rect x="12" y="11.5" width="6" height="1" rx="0.5" />
  </svg>
);

export const GmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <text x="5" y="17" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none">G</text>
  </svg>
);

export const NotionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7L4 17L8 20L8 10L4 7Z" />
    <path d="M4 7L12 3L16 6L8 10L4 7Z" />
    <path d="M8 10L16 6L16 16L8 20L8 10Z" />
    <text x="10" y="15" fontSize="5" fill="currentColor" stroke="none" fontWeight="bold">N</text>
  </svg>
);
