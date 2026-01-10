import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import Chat from './pages/Chat'
import Tasks from './pages/Tasks'
import './App.css'

function Layout() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        {/* Sidebar content will be implemented later */}
      </aside>
      <main className="main-content">
        <Outlet />
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
