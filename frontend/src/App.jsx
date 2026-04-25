import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RoomSelectionPage from './pages/RoomSelectionPage'

import API_BASE_URL from './apiConfig'

const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
        console.log("Not logged in")
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { credentials: 'include' })
      setUser(null)
    } catch (err) {
      console.error("Logout failed", err)
      // Fallback: clear state anyway
      setUser(null)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#030305] flex items-center justify-center text-white">Loading...</div>

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#030305] text-white overflow-hidden selection:bg-purple-500/30">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/rooms" /> : <WelcomePage />} />
          <Route path="/rooms" element={user ? <RoomSelectionPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/room/:roomId" element={user ? <HomePage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/login" element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/rooms" />} />
          <Route path="/signup" element={!user ? <SignupPage onSignup={setUser} /> : <Navigate to="/rooms" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App