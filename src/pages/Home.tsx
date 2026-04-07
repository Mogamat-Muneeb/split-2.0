/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dumbbell, Play } from "lucide-react";
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import type { Workout } from "@/lib/types";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";

const Home = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);
  const { openStartWorkoutModal, activeWorkout, setMiniMize } = useLogWorkout();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1019);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let subscription: any;

    const fetchWorkouts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: workoutsData, error } = await supabase
          .from("workouts")
          .select(
            `
            id,
            name,
            created_at,
            workout_exercises(
              id,
              exercise_id,
              name,
              notes,
              exercise_image,
              rest_timer,
              position,
              sets(
                id,
                set_number,
                weight,
                reps,
                rep_range_min,
                rep_range_max
              )
            )
          `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        setWorkouts(workoutsData || []);

        subscription = supabase
          .channel(`public:workouts:user_id=eq.${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workouts",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              setWorkouts((prev: any) => {
                switch (payload.eventType) {
                  case "INSERT":
                    return [payload.new, ...prev];
                  case "UPDATE":
                    return prev.map((w: any) =>
                      w.id === payload.new.id ? payload.new : w,
                    );
                  case "DELETE":
                    return prev.filter((w: any) => w.id !== payload.old.id);
                  default:
                    return prev;
                }
              });
            },
          )
          .subscribe();
      } catch (err) {
        console.error("Failed to fetch workouts:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load workouts",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkouts();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto pt-10 space-y-10">
      <div>
        <h2 className="text-orange-600 font-black lg:text-2xl text-lg tracking-tight">
          Workouts
        </h2>
        <p className="text-sm">Choose a routine or start fresh.</p>
      </div>

      <div>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-4">
          <motion.div
            className="flex justify-between items-center bg-[#3D348B] h-full rounded-4xl p-5 lg:col-span-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div>
              <h2 className="text-base tracking-tight font-bold text-white dark:text-accent-foreground">
                Current Split
              </h2>
              <p className="text-sm text-white dark:text-accent-foreground">
                Build your session as you go
              </p>
            </div>
            <motion.div
              onClick={() => {
                console.log("current split");
              }}
              className="rounded-full p-3 w-fit dark:bg-white bg-accent-foreground"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Play className="stroke-background fill-background" size={18} />
            </motion.div>
          </motion.div>

          <motion.div
            className="flex justify-between items-center bg-orange-600 h-full rounded-4xl p-5"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div>
              <h2 className="text-base tracking-tight font-bold text-white dark:text-accent-foreground">
                Empty Workout
              </h2>
              <p className="text-sm text-white dark:text-accent-foreground">
                Build your session as you go
              </p>
            </div>
            <motion.div
              onClick={() => {
                openStartWorkoutModal();

                setMiniMize(false);
                localStorage.setItem("miniMize", JSON.stringify(false));
              }}
              className="rounded-full p-3 w-fit dark:bg-white bg-accent-foreground"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Play className="stroke-background fill-background" size={18} />
            </motion.div>
          </motion.div>

          <Link to={"/dashboard/manage-workouts"}>
            <motion.div
              className="flex justify-between items-center gap-2 bg-[#FAF6FA] dark:bg-[#2d2d2d] h-full rounded-4xl p-5"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  Manage Workout
                </h2>
                <p className="text-sm">Edit your saved workouts</p>
              </div>
              <motion.div
                className="rounded-2xl p-3 w-fit dark:bg-white bg-accent-foreground"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Dumbbell
                  className="fill-background stroke-background"
                  size={18}
                />
              </motion.div>
            </motion.div>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex w-full justify-between items-center">
          <h2 className="font-bold tracking-tight">My workouts</h2>
          {/* <p className="text-orange-600 text-sm">View all</p> */}
        </div>

        <div className="mt-4 flex items-center w-full">
          <div className="w-full">
            {/* Loading State */}
            {isLoading && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Loading workouts..
              </p>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  Error: {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Workouts List */}
            {!isLoading && !error && workouts.length === 0 && (
              <div className="p-8 text-center bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-3xl">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No workouts yet. Create your first workout!
                </p>
              </div>
            )}

            <div className="lg:grid-cols-2 grid-cols-1 grid gap-3">
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
        </div>
      </div>
    </div>
  );
};

export default Home;
