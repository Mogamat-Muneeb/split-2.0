import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <>
              {/* Dashboard
              <button onClick={() => supabase.auth.signOut()}>Logout</button> */}

              <Dashboard />
            </>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
