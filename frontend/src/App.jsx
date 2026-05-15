import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RoomSelectionPage from './pages/RoomSelectionPage'
import GlobalCalendarPage from './pages/GlobalCalendarPage'
import AttendancePage from './pages/AttendancePage'
import AppLayout from './components/layout/AppLayout'

import API_BASE_URL from './apiConfig'

const ProtectedRoute = ({ user, authChecked, children }) => {
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }
  return user ? children : <Navigate to="/" />
}

const PublicRoute = ({ user, children }) => {
  return user ? <Navigate to="/rooms" /> : children
}

const App = () => {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Persist Auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setUser(data.user)
        }
      } catch (err) {
        console.log('Not logged in')
      } finally {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { credentials: 'include' })
      setUser(null)
    } catch (err) {
      console.error('Logout failed', err)
      setUser(null)
    }
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen overflow-hidden selection:bg-purple-500/30">
        <Routes>
          <Route path="/" element={<PublicRoute user={user}><WelcomePage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute user={user}><LoginPage onLogin={setUser} /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute user={user}><SignupPage onSignup={setUser} /></PublicRoute>} />
          <Route path="/todo" element={user ? <Navigate to="/room/personal" /> : <Navigate to="/" />} />

          {/* Authenticated Routes wrapped in Layout */}
          <Route path="/rooms" element={<ProtectedRoute user={user} authChecked={authChecked}><AppLayout user={user} onLogout={handleLogout}><RoomSelectionPage user={user} onLogout={handleLogout} /></AppLayout></ProtectedRoute>} />
          <Route path="/room/:roomId" element={<ProtectedRoute user={user} authChecked={authChecked}><AppLayout user={user} onLogout={handleLogout}><HomePage user={user} onLogout={handleLogout} /></AppLayout></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute user={user} authChecked={authChecked}><AppLayout user={user} onLogout={handleLogout}><GlobalCalendarPage user={user} onLogout={handleLogout} /></AppLayout></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute user={user} authChecked={authChecked}><AppLayout user={user} onLogout={handleLogout}><AttendancePage user={user} /></AppLayout></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App