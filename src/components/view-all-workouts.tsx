import React, { type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ActiveWorkout, Workout } from "@/lib/types";
import { ArrowLeft, Play } from "lucide-react";
import WorkoutCard from "./workout-card";

interface WiewAllWorkoutsProps {
  setViewAll: Dispatch<SetStateAction<boolean>>;
  viewAll: boolean;

  workouts: Workout[];
  isLoading: boolean;
  error: string | null;

  hoveredWorkout: string | null;
  setHoveredWorkout: Dispatch<SetStateAction<string | null>>;

  isMobile: boolean;

  activeWorkout: ActiveWorkout | null;
  openStartWorkoutModal: (workout?: Workout) => void;
  setMiniMize: Dispatch<SetStateAction<boolean>>;
}

const WiewAllWorkouts: React.FC<WiewAllWorkoutsProps> = ({
  setViewAll,
  viewAll,
  workouts,
  isLoading,
  error,
  hoveredWorkout,
  setHoveredWorkout,
  isMobile,
  activeWorkout,
  openStartWorkoutModal,
  setMiniMize,
}) => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          setViewAll(!viewAll);
        }}
        className="fixed inset-0 bg-black/20 z-40"
      />
      <AnimatePresence mode="wait">
        <motion.div
          key="start-workout"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-[#1a1a1a] rounded-2xl lg:max-w-2xl max-w-full w-full shadow-xl lg:h-[95vh] h-dvh "
        >
          <div className="lg:max-h-full max-h-screen overflow-y-auto pb-48">
            <div className=" flex items-center gap-1 px-3 sticky top-0 bg-background py-6  rounded-t-2xl">
              <div
                onClick={() => setViewAll(!viewAll)}
                className="lg:hidden flex"
              >
                <ArrowLeft size={18} />
              </div>
              <h2 className="tracking-tight font-bold  w-full  ">
                Workouts{" "}
                <span className="text-white bg-orange-600 px-2 py-1 rounded-full text-sm">
                  {workouts.length}
                </span>
              </h2>
            </div>
            <div className="p-3  ">
              {!isLoading &&
                !error &&
                workouts.map((workout) => {
                  const isHovered = hoveredWorkout === workout.id;
                  return (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      isMobile={isMobile}
                      isHovered={isHovered}
                      setHoveredWorkout={setHoveredWorkout}
                      activeWorkout={activeWorkout}
                      openStartWorkoutModal={openStartWorkoutModal}
                      setMiniMize={setMiniMize}
                      setViewAll={setViewAll}
                    />
                  );
                })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default WiewAllWorkouts;
