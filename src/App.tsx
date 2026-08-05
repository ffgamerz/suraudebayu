import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AhliKariah from './pages/AhliKariah'
import ExportPage from './pages/Export'
import RegistrationForm from './components/RegistrationForm'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-wrapper">
          <Routes>
            <Route path="/" element={<RegistrationForm />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/ahli-kariah" element={<ProtectedRoute><AhliKariah /></ProtectedRoute>} />
            <Route path="/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
            <Route path="/devexport" element={<ExportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
