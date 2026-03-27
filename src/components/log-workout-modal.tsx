import React, { useState } from "react";
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
  const { startWorkout, activeWorkout, resetWorkout, openStartWorkoutModal } =
    useLogWorkout();

  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    if (isEmptyWorkout) {
      const emptyWorkout: Workout = {
        id: null,
        name: "Empty Workout",
        workout_exercises: [],
        created_at: new Date().toISOString(),
        user_id: "",
      };
      startWorkout(emptyWorkout);
    } else {
      startWorkout(workout);
    }
    setHasStarted(true);
  };

  const handleResume = () => {
    onClose();
    if (activeWorkout) {
      openStartWorkoutModal(activeWorkout);
    }
  };

  const handleStartNew = () => {
    resetWorkout();
    if (isEmptyWorkout) {
      const emptyWorkout: Workout = {
        id: `temp-${Date.now()}`,
        name: "Empty Workout",
        workout_exercises: [],
        created_at: new Date().toISOString(),
        user_id: "",
      };
      startWorkout(emptyWorkout);
    } else {
      startWorkout(workout);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 z-40"
      />

      <AnimatePresence mode="wait">
        {activeWorkout || hasStarted ? (
          activeWorkout?.id === workout?.id ||
          activeWorkout?.workoutId === workout?.id ||
          hasStarted ? (
            <motion.div
              key="active-workout"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-5xl"
            >
              <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-6 m-4">
                <div className="max-h-[50vh] overflow-y-auto">
                  <div className="flex justify-between items-center w-full mb-4">
                    <div className="flex items-center gap-2">
                      <ChevronDown size={16} />
                      <h2 className="text-sm">Log Workout</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <WatchIcon />
                      </div>
                      <div>
                        <Button>Finish</Button>
                      </div>
                    </div>
                  </div>
                  <LoggingWorkout activeWorkout={activeWorkout} />
                  <Button
                    variant="destructive"
                    onClick={() => {
                      resetWorkout();
                      onClose();
                    }}
                  >
                    Discard Active Workout
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="workout-in-progress"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl"
            >
              <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-6 m-4">
                <div className="max-h-[50vh] overflow-y-auto">
                  <div className="space-y-4 text-center">
                    <p className="font-bold tracking-tight">
                      You have a workout in progress
                    </p>
                    <p className="">
                      If you start a new workout, your old <br />
                      workout will be permanently deleted.
                    </p>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleResume}
                        className="bg-orange-600 text-foreground"
                      >
                        Resume workout in progress
                      </Button>
                      <Button onClick={handleStartNew}>
                        Start New Workout
                      </Button>
                      <Button
                        variant="outline"
                        className="border-0"
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          resetWorkout();
                          onClose();
                        }}
                      >
                        Discard Active Workout
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        ) : isEmptyWorkout ? (
          <motion.div
            key="empty-workout"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-6 m-4">
              <div className="space-y-4 text-center">
                <h3 className="tracking-tight font-bold">
                  Start Empty Workout
                </h3>
                <p className="text-sm">
                  This will start an empty workout. You can add <br /> exercises
                  as you go.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleStart}
                    className="bg-orange-600 text-white"
                  >
                    Start Empty Workout
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : workout && workout.workout_exercises?.length ? (
          <motion.div
            key="workout-exercises"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-5xl"
          >
            <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-6 m-4">
              <div className="max-h-[50vh] overflow-y-auto">
                <div className="space-y-4">
                  {workout.workout_exercises.map((ex) => (
                    <div
                      key={ex.id + Math.random}
                      className="flex justify-between items-center p-2 bg-accent rounded-xl"
                    >
                      <p className="tracking-tight font-medium text-14">
                        {ex.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {ex.sets?.length || 0} sets
                      </p>
                    </div>
                  ))}
                  <Button
                    onClick={handleStart}
                    className="bg-orange-600 text-white"
                  >
                    Start Workout
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default LogWorkoutModal;
