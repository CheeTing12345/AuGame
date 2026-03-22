import { BrowserRouter, Routes, Route } from 'react-router'
import Welcome from './screens/Welcome'
import CreateJoin from './screens/CreateJoin'
import Lobby from './screens/Lobby'
import Rules from './screens/Rules'
import TowerGame from './screens/TowerGame'

export default function App() {
  return (
    <BrowserRouter>
      {/* Animated gradient blobs — always in background */}
      <div className="blob-a" />
      <div className="blob-b" />
      <div className="blob-c" />

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/create-join" element={<CreateJoin />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/game" element={<TowerGame />} />
      </Routes>
    </BrowserRouter>
  )
}
