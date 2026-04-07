import React, { type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Workout } from "@/lib/types";
import { ArrowBigLeft, ArrowLeft, Play } from "lucide-react";

interface WiewAllWorkoutsProps {
  setViewAll: Dispatch<SetStateAction<boolean>>;
  viewAll: boolean;

  workouts: Workout[];
  isLoading: boolean;
  error: string | null;

  hoveredWorkout: string | null;
  setHoveredWorkout: Dispatch<SetStateAction<string | null>>;

  isMobile: boolean;

  activeWorkout: Workout | null;
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
          <div className="lg:max-h-full max-h-screen overflow-y-auto">
            <div className=" flex items-center gap-3 px-3">
              <div
                onClick={() => setViewAll(!viewAll)}
                className="lg:hidden flex"
              >
                <ArrowLeft size={20} />
              </div>
              <h2 className="tracking-tight font-bold  w-full py-3 sticky top-0 bg-background  rounded-t-2xl">
                Workouts{" "}
                <span className="text-white bg-orange-600 px-2 py-1 rounded-full text-sm">
                  {workouts.length}
                </span>
              </h2>
            </div>
            <div className="p-3">
              {!isLoading &&
                !error &&
                workouts.map((workout) => {
                  const isHovered = hoveredWorkout === workout.id;
                  return (
                    <motion.div
                      key={workout.id + Math.random}
                      className="p-4 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-3xl mb-2 flex items-center justify-between"
                      onHoverStart={() =>
                        !isMobile && setHoveredWorkout(workout.id)
                      }
                      onHoverEnd={() => !isMobile && setHoveredWorkout(null)}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-full flex flex-col">
                        <h3 className="lg:flex hidden font-bold tracking-tight truncate">
                          {workout.name}
                        </h3>
                        <h3 className="flex lg:hidden font-bold tracking-tight truncate">
                          {workout.name.length > 10
                            ? `${workout.name.slice(0, 15)}...`
                            : workout.name}
                        </h3>
                        <div className="mt-3 flex items-center text-sm">
                          <p className="mr-1 whitespace-nowrap">
                            {workout.workout_exercises?.length} Exercises
                            {/* • */}
                          </p>
                          {/* <p className="truncate">
                                    {workout?.workout_exercises &&
                                      workout?.workout_exercises
                                        .slice(0, 1)
                                        ?.map((exercise) => exercise.name)
                                        .join(", ")}
                                    {workout?.workout_exercises &&
                                      workout?.workout_exercises?.length > 1 &&
                                      " ..."}
                                  </p> */}
                        </div>
                      </div>
                      <div>
                        {isMobile ? (
                          <motion.div
                            onClick={async () => {
                              if (!activeWorkout) {
                                // await handleStart(workout);
                                openStartWorkoutModal(workout);
                              } else {
                                setMiniMize(false);
                                localStorage.setItem(
                                  "miniMize",
                                  JSON.stringify(false),
                                );
                                openStartWorkoutModal(workout);
                              }
                            }}
                            className="rounded-full p-3 w-fit dark:bg-white bg-accent-foreground cursor-pointer"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            whileHover={{ scale: 1.1 }}
                          >
                            <Play
                              className="stroke-background fill-background"
                              size={18}
                            />
                          </motion.div>
                        ) : (
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                onClick={async () => {
                                  if (!activeWorkout) {
                                    // await handleStart(workout);
                                    openStartWorkoutModal(workout);
                                  } else {
                                    setMiniMize(false);
                                    localStorage.setItem(
                                      "miniMize",
                                      JSON.stringify(false),
                                    );
                                    openStartWorkoutModal(workout);
                                  }
                                }}
                                className="rounded-full p-3 w-fit dark:bg-white bg-accent-foreground cursor-pointer"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                whileHover={{ scale: 1.1 }}
                              >
                                <Play
                                  className="stroke-background fill-background"
                                  size={18}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </div>
                    </motion.div>
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
