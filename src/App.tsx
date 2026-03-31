import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Splits from "./pages/splits";
import ManageWorkouts from "./pages/ManageWorkouts";
import Measure from "./pages/Measure";

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
        <Route path="stats" element={<Measure />} />
        <Route path="splits" element={<Splits />} />
        <Route path="manage-workouts" element={<ManageWorkouts />} />
        <Route
          path="exercises"
          element={
            <div>
              <div className="">Dashboard Exercises</div>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
