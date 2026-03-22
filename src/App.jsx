import { BrowserRouter, Routes, Route } from 'react-router'
import Welcome from './screens/Welcome'
import CreateJoin from './screens/CreateJoin'
import Lobby from './screens/Lobby'
import TowerGame from './screens/TowerGame'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/create-join" element={<CreateJoin />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={<TowerGame />} />
      </Routes>
    </BrowserRouter>
  )
}
