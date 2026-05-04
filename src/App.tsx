import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Splits from "./pages/splits";
import ManageWorkouts from "./pages/ManageWorkouts";
import Measure from "./pages/Measure";
import StatsHome from "./pages/StatsHome";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={"Landing"} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="stats" element={<Measure />}>
          <Route index element={<StatsHome />} />
          <Route path="exercises" element={<div>Exercises Content</div>} />
          <Route
            path="measurements"
            element={<div>Measurements Content</div>}
          />
        </Route>
        <Route path="splits" element={<Splits />} />

        <Route path="manage-workouts" element={<ManageWorkouts />} />
        <Route path="exercises" element={<div>Dashboard Exercises</div>} />
      </Route>
    </Routes>
  );
}
