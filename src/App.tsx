import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RegistrationForm from './components/RegistrationForm'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Routes>
          <Route path="/" element={<RegistrationForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
