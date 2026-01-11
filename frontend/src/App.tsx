import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import Chat from './pages/Chat'
import Tasks from './pages/Tasks'
import Logo from './components/logo'
import ChatButton from './components/chatbutton'
import TaskButton from './components/taskbutton'

function Layout() {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-60 min-w-60 bg-main-bg flex flex-col p-4">
        <Logo />
        <div className="w-full h-px bg-[#C5BDAD] my-3" />
        <div className="flex flex-col gap-1">
          <ChatButton />
          <TaskButton />
        </div>
      </aside>
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
