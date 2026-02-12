import React, { useState, useEffect, useRef } from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import "./App.css";

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import MyRequests from "./pages/MyRequests";
import HRDashboard from "./pages/HRDashboard";
import HRCredits from "./pages/HRCredits";
import HRPublicHolidays from "./pages/HRPublicHolidays";
import HRSettings from "./pages/HRSettings";
import Layout from "./components/Layout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Configure axios
axios.defaults.withCredentials = true;

// Auth Context
export const AuthContext = React.createContext(null);

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await axios.get(`${API}/auth/session?session_id=${sessionId}`);
          const user = response.data;
          // Clear hash and navigate
          window.history.replaceState(null, "", window.location.pathname);
          navigate("/dashboard", { state: { user } });
        } catch (error) {
          console.error("Auth error:", error);
          toast.error("Authentication failed");
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 spinner" />
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [user, setUser] = useState(location.state?.user || null);

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/login");
      }
    };

    checkAuth();
  }, [location.state, navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

function AppRouter() {
  const location = useLocation();

  // Check for session_id in URL hash BEFORE rendering routes
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="my-requests" element={<MyRequests />} />
        <Route path="hr/dashboard" element={<HRDashboard />} />
        <Route path="hr/credits" element={<HRCredits />} />
        <Route path="hr/public-holidays" element={<HRPublicHolidays />} />
        <Route path="settings" element={<HRSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <Toaster position="top-right" richColors closeButton />
      <HashRouter>
        <AppRouter />
      </HashRouter>
    </div>
  );
}

export default App;
