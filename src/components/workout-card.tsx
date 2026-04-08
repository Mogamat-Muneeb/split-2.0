import type { Workout, ActiveWorkout } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface WorkoutCardProps {
  workout: Workout;
  isMobile: boolean;
  isHovered: boolean;
  setHoveredWorkout: (id: string | null) => void;
  activeWorkout: ActiveWorkout | null;
  openStartWorkoutModal: (workout?: Workout) => void;
  setMiniMize: (value: boolean) => void;
  setViewAll: Dispatch<SetStateAction<boolean>>;
}

const WorkoutCard = ({
  workout,
  isMobile,
  isHovered,
  setHoveredWorkout,
  activeWorkout,
  openStartWorkoutModal,
  setMiniMize,
  setViewAll,
}: WorkoutCardProps) => {
  return (
    <motion.div
      className="p-4 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-3xl mb-2 flex items-center justify-between"
      onHoverStart={() => !isMobile && setHoveredWorkout(workout.id)}
      onHoverEnd={() => !isMobile && setHoveredWorkout(null)}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="w-full flex flex-col">
        <h3 className="lg:flex hidden font-bold tracking-tight truncate">
          {workout.name}
        </h3>
        <h3 className="flex lg:hidden font-bold lg:text-base text-sm tracking-tight truncate">
          {workout.name.length > 15
            ? `${workout.name.slice(0, 15)}...`
            : workout.name}
        </h3>

        <div className="mt-3 flex items-center lg:text-sm text-xs">
          <p className="mr-1 whitespace-nowrap">
            {workout.workout_exercises?.length} Exercises •
          </p>
          <p className="truncate">
            {workout?.workout_exercises
              ?.slice(0, 1)
              ?.map((exercise) => exercise.name)
              .join(", ")}
            {workout?.workout_exercises?.length > 1 && " ..."}
          </p>
        </div>
      </div>

      <div>
        {isMobile ? (
          <motion.div
            onClick={() => {
              if (!activeWorkout) {
                openStartWorkoutModal(workout);
                setViewAll(false);
              } else {
                setMiniMize(false);
                localStorage.setItem("miniMize", JSON.stringify(false));
                openStartWorkoutModal(workout);
              }
            }}
            className="rounded-full p-2 w-fit dark:bg-white bg-accent-foreground cursor-pointer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.1 }}
          >
            <Play className="stroke-background fill-background" size={12} />
          </motion.div>
        ) : (
          <AnimatePresence>
            {isHovered && (
              <motion.div
                onClick={() => {
                  if (!activeWorkout) {
                    openStartWorkoutModal(workout);
                    setViewAll(false);
                  } else {
                    setMiniMize(false);
                    localStorage.setItem("miniMize", JSON.stringify(false));
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
                <Play className="stroke-background fill-background" size={18} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default WorkoutCard;
