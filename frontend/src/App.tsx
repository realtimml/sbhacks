import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import Chat from './pages/Chat'
import Tasks from './pages/Tasks'
import Logo from './components/logo'
import ChatButton from './components/chatbutton'
import TaskButton from './components/taskbutton'
import QuickLinks from './components/connections'
import ConnectionsModal, { SlackIcon, GmailIcon, NotionIcon } from './components/ConnectionsModal'
import { initiateOAuth, getConnections, checkOAuthPending } from './lib/api'

function Layout() {
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Connection states - updated from API
  const [connections, setConnections] = useState([
    { id: 'slack', name: 'Slack', icon: <SlackIcon />, connected: false },
    { id: 'gmail', name: 'Gmail', icon: <GmailIcon />, connected: false },
    { id: 'notion', name: 'Notion', icon: <NotionIcon />, connected: false },
  ]);

  // Fetch connections from backend
  const fetchConnections = async () => {
    try {
      const connectedApps = await getConnections();
      setConnections(prev => 
        prev.map(c => ({
          ...c,
          connected: connectedApps.includes(c.id.toUpperCase()) || connectedApps.includes(c.id)
        }))
      );
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // On mount: check for OAuth return and fetch connections
  useEffect(() => {
    const pendingOAuth = checkOAuthPending();
    if (pendingOAuth) {
      console.log(`OAuth completed for: ${pendingOAuth}`);
    }
    fetchConnections();
  }, []);

  const connectedCount = connections.filter(c => c.connected).length;

  const handleConnect = async (connectionId: string) => {
    try {
      console.log(`Initiating OAuth for ${connectionId}...`);
      await initiateOAuth(connectionId);
      // User will be redirected to OAuth provider
    } catch (error) {
      console.error(`Failed to initiate OAuth for ${connectionId}:`, error);
    }
  };

  return (
    <div className="flex h-screen w-full">
      <aside className="w-60 min-w-60 bg-sidebar flex flex-col p-4 pl-6">
        <Logo />
        <div className="w-full h-px bg-[#C5BDAD] my-3" />
        <div className="flex flex-col gap-1">
          <ChatButton />
          <TaskButton />
        </div>
        <div className="w-full h-px bg-[#C5BDAD] my-3" />
        {/* Spacer to push QuickLinks to bottom */}
        <div className="flex-1" />
        <QuickLinks connections={connections} onConnect={handleConnect} />
      </aside>

      {/* Connections Modal */}
      <ConnectionsModal
        isOpen={isConnectionsOpen}
        onClose={() => setIsConnectionsOpen(false)}
        connections={connections}
        onConnect={handleConnect}
      />
      <main className="flex-1 bg-main-bg flex min-h-0 flex-col pl-3 pr-6 py-8">
        <div className="flex-1 bg-[#F5EFE6] rounded-2xl min-h-0 flex flex-col overflow-hidden">
          <Outlet context={{ 
            connectedCount, 
            totalCount: connections.length, 
            openConnectionsModal: () => setIsConnectionsOpen(true),
            isLoading
          }} />
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
