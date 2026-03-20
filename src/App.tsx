import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Splits from "./pages/splits";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <div>
              <div className="">Dashboard Home</div>
            </div>
          }
        />
        <Route path="splits" element={<Splits />} />
        <Route path="exercises" element={       <div>
              <div className="">Dashboard Exercises</div>
            </div>} />
      </Route>
    </Routes>
  );
}
