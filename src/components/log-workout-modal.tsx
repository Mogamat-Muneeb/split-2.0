import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import type { Workout } from "@/lib/types";
import LoggingWorkout from "./logging-workout";
import { ChevronDown, WatchIcon } from "lucide-react";

interface LogWorkoutModalProps {
  open: boolean;
  onClose: () => void;
  workout?: Workout;
  isEmptyWorkout?: boolean;
}

const LogWorkoutModal: React.FC<LogWorkoutModalProps> = ({
  open,
  onClose,
  workout,
  isEmptyWorkout = false,
}) => {
  const {
    startWorkout,
    activeWorkout,
    resetWorkout,
    endWorkout,
    resumeWorkout,
    setForceOpenWorkoutModal,
    forceOpenWorkoutModal,
    setMiniMize,
  } = useLogWorkout();

  const handleStart = () => {
    if (isEmptyWorkout) {
      startWorkout();
    } else {
      startWorkout(workout);
    }
  };

  const handleMinimizeAndClose = () => {
    if (activeWorkout) {
      setMiniMize(true);
      localStorage.setItem("miniMize", JSON.stringify(true));
      onClose(); // Close the modal
    }
  };

  const handleStartNew = () => {
    resetWorkout();
    if (isEmptyWorkout) {
      startWorkout();
    } else {
      startWorkout(workout);
    }
    onClose();
  };

  const handleFinish = () => {
    endWorkout();
    onClose();
  };

  if (!open) return null;

  const targetWorkout = isEmptyWorkout
    ? { id: "empty", name: "Empty Workout" }
    : workout;
  const isActiveWorkout =
    activeWorkout &&
    ((isEmptyWorkout && activeWorkout.workoutId === null) ||
      (!isEmptyWorkout && workout && activeWorkout.workoutId === workout.id));

  const shouldShowLoggingModal =
    (activeWorkout && isActiveWorkout) || forceOpenWorkoutModal;

  if (shouldShowLoggingModal) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            onClose();
            setForceOpenWorkoutModal(false);
            handleMinimizeAndClose();
          }}
          className="fixed inset-0 bg-black/20 z-40"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-5xl lg:px-0 px-2"
        >
          <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-3   max-w-4xl w-full">
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center w-full  sticky top-0 z-40 bg-white dark:bg-[#2d2d2d]">
                <div
                  className="flex items-center gap-2"
                  onClick={handleMinimizeAndClose}
                >
                  <ChevronDown size={16} />
                  <h2 className="text-sm">Log Workout</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <WatchIcon />
                  </div>
                  <div>
                    <Button onClick={handleFinish} className="text-xs">
                      Finish
                    </Button>
                  </div>
                </div>
              </div>
              <LoggingWorkout activeWorkout={activeWorkout} />
              <div className="w-full flex justify-end">
                <Button
                  className="bg-red-700 text-white "
                  onClick={() => {
                    resetWorkout();
                    onClose();
                  }}
                >
                  Discard Workout
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          onClose();
          setForceOpenWorkoutModal(false);
          handleMinimizeAndClose();
        }}
        className="fixed inset-0 bg-black/20 z-40"
      />

      <AnimatePresence mode="wait">
        {/* Case 1: No active workout - start the workout */}
        {!activeWorkout && (
          <motion.div
            key="start-workout"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm  shadow-xl"
          >
            <h2 className="tracking-tight font-bold mb-2">Start Workout</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Ready to start "{targetWorkout?.name}"?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 !border-transparent"
              >
                Cancel
              </Button>
              <Button onClick={handleStart} className="flex-1">
                Start Now
              </Button>
            </div>
          </motion.div>
        )}

        {/* Case 2: Active workout exists and it's NOT the same as the clicked workout */}
        {activeWorkout && !isActiveWorkout && (
          <motion.div
            key="different-workout"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
          >
            <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-6 m-4">
              <div className="max-h-[50vh] overflow-y-auto">
                <div className="space-y-4 text-center">
                  <p className="font-bold tracking-tight">
                    You have a workout in progress
                  </p>
                  <p className="text-sm">
                    If you start a new workout, your old <br />
                    workout will be permanently deleted.
                  </p>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={resumeWorkout}
                      className="bg-orange-600 text-foreground"
                    >
                      Resume workout in progress
                    </Button>
                    <Button onClick={handleStartNew}>Start New Workout</Button>
                    <div className="grid grid-cols-2 items-center gap-1 w-full">
                      <Button
                        variant="outline"
                        className="border-0 w-full"
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-red-700 text-white  w-full"
                        onClick={() => {
                          resetWorkout();
                          onClose();
                        }}
                      >
                        Discard Workout
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Case 3: Active workout exists and it IS the same as the clicked workout */}
        {shouldShowLoggingModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-5xl lg:px-0 px-2"
          >
            <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-3  max-w-4xl w-full">
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="flex justify-between items-center w-full  z-40  sticky top-0 bg-white dark:bg-[#2d2d2d]">
                  <div
                    className="flex items-center gap-2"
                    onClick={handleMinimizeAndClose}
                  >
                    <ChevronDown size={16} />
                    <h2 className="text-sm">Log Workout</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <WatchIcon />
                    </div>
                    <div>
                      <Button onClick={handleFinish} className="text-xs">
                        Finish
                      </Button>
                    </div>
                  </div>
                </div>
                <LoggingWorkout activeWorkout={activeWorkout} />
                <div className="w-full flex justify-end">
                  <Button
                    className="bg-red-700 text-white "
                    onClick={() => {
                      resetWorkout();
                      onClose();
                    }}
                  >
                    Discard Workout
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LogWorkoutModal;
