import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import TasksPage from "./pages/TasksPage";
import Layout from "./components/Layout";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="dark min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="dark min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <div className="dark">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute roles={["admin"]}><Layout><UsersPage /></Layout></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Layout><TasksPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
