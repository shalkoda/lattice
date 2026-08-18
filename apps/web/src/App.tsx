import { useEffect } from 'react'
import { TranscriptPanel } from './components/TranscriptPanel'
import { ArchitectureCanvas } from './components/ArchitectureCanvas'
import { useArchitectureStore } from './store/architecture'
import './App.css'

function App() {
  const initialize = useArchitectureStore(state => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Lattice</h1>
        <p>Conversational Intelligence for Architecture</p>
      </header>
      <main className="app-main">
        <div className="panel-left">
          <TranscriptPanel />
        </div>
        <div className="panel-right">
          <ArchitectureCanvas />
        </div>
      </main>
    </div>
  )
}

export default App
