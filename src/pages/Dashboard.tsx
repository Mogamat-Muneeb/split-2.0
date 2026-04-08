/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import FloatingNav from "@/components/floating-nav";
import LogWorkoutModal from "@/components/log-workout-modal";
import Navbar from "@/components/navbar";
import { formatTime } from "@/lib/utils";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import { ChevronUp, Trash2 } from "lucide-react";
import { Outlet } from "react-router-dom";

const Dashboard = () => {
  const {
    startWorkoutModalOpen,
    closeStartWorkoutModal,
    selectedWorkout,
    miniMize,
    setForceOpenWorkoutModal,
    setStartWorkoutModalOpen,
    setMiniMize,
    activeWorkout,
    elapsedTime,
    resetWorkout,
  } = useLogWorkout();

  const handleExpandClick = () => {
    // First set miniMize to false
    setMiniMize(false);
    localStorage.setItem("miniMize", JSON.stringify(false));
    // Then open the modal
    setForceOpenWorkoutModal(true);
    setStartWorkoutModalOpen(true);
  };

  return (
    <>
      <div className="min-h-screen relative flex h-full">
        <FloatingNav />
        <Navbar />

        <div className="px-3 py-3 w-full overflow-auto">
          <Outlet />
        </div>
      </div>

      <LogWorkoutModal
        open={startWorkoutModalOpen}
        onClose={closeStartWorkoutModal}
        //@ts-ignore
        workout={selectedWorkout || undefined}
        isEmptyWorkout={!selectedWorkout}
      />

      {miniMize && activeWorkout && !startWorkoutModalOpen && (
        <div className="fixed lg:bottom-1 bottom-[6%] left-1/2 -translate-x-1/2 -translate-y-1/2 lg:w-[20%] w-[93%]  rounded-4xl shadow-2xl bg-[#FAF6FA]  dark:bg-[#2d2d2d] p-3 z-50 flex flex-col items-start">
          <div className="flex justify-between w-full items-center">
            <div className="w-full">
              <button
                onClick={handleExpandClick}
                className="p-3 dark:bg-white bg-accent-foreground rounded-full"
              >
                <ChevronUp size={16} className="stroke-background " />
              </button>
            </div>

            <div className="flex flex-col">
              <h4 className="text-sm font-bold flex gap-2 items-center w-full pl-1">
                <span className="flex justify-center ">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                </span>
                <span className="flex-1 text-start text-nowrap">
                  {activeWorkout.name.length > 10
                    ? `${activeWorkout.name.slice(0, 10)}...`
                    : activeWorkout.name}
                </span>
              </h4>
              <h2 className="text-xs w-[80px]">{formatTime(elapsedTime)}</h2>
            </div>

            <div className="w-full flex justify-end">
              <button
                className="p-3 dark:bg-white bg-accent-foreground rounded-full"
                onClick={() => {
                  resetWorkout();
                }}
              >
                <Trash2 size={16} className="stroke-background" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
