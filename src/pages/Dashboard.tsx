/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import FloatingNav from "@/components/floating-nav";
import LogWorkoutModal from "@/components/log-workout-modal";
import Navbar from "@/components/navbar";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import { AnimatePresence } from "framer-motion";

import { Outlet } from "react-router-dom";

const Dashboard = () => {
  const { startWorkoutModalOpen, closeStartWorkoutModal, selectedWorkout } =
    useLogWorkout();
  return (
    <AnimatePresence>
      <div className="min-h-screen relative flex h-full  ">
        <FloatingNav />
        <Navbar />

        <div className="px-3 py-3 w-full">
          <Outlet />
        </div>
      </div>

      <LogWorkoutModal
        open={startWorkoutModalOpen}
        onClose={closeStartWorkoutModal}
        workout={selectedWorkout || undefined}
        isEmptyWorkout={!selectedWorkout}
      />
    </AnimatePresence>
  );
};

export default Dashboard;
