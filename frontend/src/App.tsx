import { useState } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import Chat from './pages/Chat'
import Tasks from './pages/Tasks'
import Logo from './components/logo'
import ChatButton from './components/chatbutton'
import TaskButton from './components/taskbutton'
import QuickLinks from './components/quicklinks'
import ConnectionStatus from './components/connectionstatus'
import ConnectionsModal, { SlackIcon, GmailIcon, NotionIcon } from './components/ConnectionsModal'

function Layout() {
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  
  // Connection states - in a real app this would come from API/context
  const [connections, setConnections] = useState([
    { id: 'slack', name: 'Slack', icon: <SlackIcon />, connected: false },
    { id: 'gmail', name: 'Gmail', icon: <GmailIcon />, connected: true },
    { id: 'notion', name: 'Notion', icon: <NotionIcon />, connected: false },
  ]);

  const connectedCount = connections.filter(c => c.connected).length;

  const handleConnect = (connectionId: string) => {
    // In a real app, this would trigger OAuth flow
    // For now, just toggle the connection state
    setConnections(prev => 
      prev.map(c => 
        c.id === connectionId ? { ...c, connected: !c.connected } : c
      )
    );
    console.log(`Connecting to ${connectionId}...`);
    // TODO: Redirect to OAuth: window.location.href = `/api/auth/${connectionId}/start?entityId=...`
  };

  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-60 min-w-60 bg-sidebar flex flex-col p-4">
        <Logo />
        <div className="w-full h-px bg-[#C5BDAD] my-3" />
        <div className="flex flex-col gap-1">
          <ChatButton />
          <TaskButton />
        </div>
        <div className="w-full h-px bg-[#C5BDAD] my-3" />
        <QuickLinks />
        {/* Spacer to push connection status to bottom */}
        <div className="flex-1" />
        <ConnectionStatus 
          connectedCount={connectedCount} 
          totalCount={connections.length}
          onClick={() => setIsConnectionsOpen(true)}
        />
      </aside>

      {/* Connections Modal */}
      <ConnectionsModal
        isOpen={isConnectionsOpen}
        onClose={() => setIsConnectionsOpen(false)}
        connections={connections}
        onConnect={handleConnect}
      />
      <main className="flex-1 bg-main-bg flex flex-col px-10 py-8">
        <div className="flex-1 bg-[#F5EFE6] rounded-2xl flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Chat />} />
          <Route path="chat" element={<Chat />} />
          <Route path="tasks" element={<Tasks />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
