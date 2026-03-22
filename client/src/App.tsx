import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import OperationsPage from './pages/operations/OperationsPage'
import WorkspacePage from './pages/workspace/WorkspacePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('tt_token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/operations"
          element={
            <PrivateRoute>
              <OperationsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:id"
          element={
            <PrivateRoute>
              <WorkspacePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}