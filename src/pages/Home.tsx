/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dumbbell, Play } from "lucide-react";
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import type { Workout } from "@/lib/types";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import WiewAllWorkouts from "@/components/view-all-workouts";
import WorkoutCard from "@/components/workout-card";
import { toast } from "sonner";

const Home = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);
  const { openStartWorkoutModal, activeWorkout, setMiniMize } = useLogWorkout();
  const [viewAll, setViewAll] = useState(false);

  const [activeSplit, setActiveSplit] = useState<Split | null>(null);
  const [isLoadingSplit, setIsLoadingSplit] = useState(true);

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

    const fetchActiveSplit = async () => {
      try {
        setIsLoadingSplit(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch the active split with all its data
        const { data: splitData, error } = await supabase
          .from("splits")
          .select(
            `
            id,
            name,
            difficulty,
            is_active,
            created_at,
            updated_at,
            split_days (
              id,
              day_number,
              name,
              weekday,
              position,
              split_day_exercises (
                id,
                exercise_id,
                name,
                notes,
                rest_timer,
                position,
                split_exercise_sets (
                  id,
                  set_number,
                  weight,
                  reps,
                  rep_range_min,
                  rep_range_max,
                  rep_type,
                  type
                )
              )
            )
          `,
          )
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;

        if (splitData) {
          // Transform the data to match the Split interface
          const transformedSplit = {
            id: splitData.id,
            name: splitData.name,
            difficulty: splitData.difficulty,
            is_active: splitData.is_active,
            created_at: splitData.created_at,
            updated_at: splitData.updated_at,
            days: (splitData.split_days || [])
              .sort((a: any, b: any) => a.position - b.position)
              .map((day: any) => ({
                id: day.id,
                day_number: day.day_number,
                name: day.name,
                weekday: day.weekday,
                position: day.position,
                exercises: (day.split_day_exercises || [])
                  .sort((a: any, b: any) => a.position - b.position)
                  .map((exercise: any) => ({
                    id: exercise.id,
                    exercise_id: exercise.exercise_id,
                    name: exercise.name,
                    notes: exercise.notes,
                    rest_timer: exercise.rest_timer,
                    position: exercise.position,
                    sets: (exercise.split_exercise_sets || [])
                      .sort((a: any, b: any) => a.set_number - b.set_number)
                      .map((set: any) => ({
                        id: set.id,
                        set_number: set.set_number,
                        weight: set.weight,
                        reps: set.reps,
                        rep_range_min: set.rep_range_min,
                        rep_range_max: set.rep_range_max,
                        rep_type: set.rep_type,
                        type: set.type,
                      })),
                  })),
              })),
          };

          setActiveSplit(transformedSplit);
        } else {
          setActiveSplit(null);
        }

        // Subscribe to real-time changes for splits
        subscription = supabase
          .channel(`public:splits:user_id=eq.${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "splits",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              // Refetch when any split changes
              fetchActiveSplit();
            },
          )
          .subscribe();
      } catch (err) {
        console.error("Failed to fetch active split:", err);
        setActiveSplit(null);
      } finally {
        setIsLoadingSplit(false);
      }
    };

    fetchActiveSplit();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const startSplitWorkout = () => {
    if (activeSplit && activeSplit.days && activeSplit.days.length > 0) {
      const firstDay = activeSplit.days[0];
      
      // Transform the split day into a Workout format that the provider expects
      const workoutFromSplit: Workout = {
        id: null, // Create a temporary ID or use a specific format
        name: `${activeSplit.name} - ${firstDay.name || `Day ${firstDay.day_number}`}`,
        created_at: new Date().toISOString(),
        workout_exercises: firstDay.exercises.map((exercise, idx) => ({
          id: exercise.id,
          name: exercise.name,
          notes: exercise.notes || "",
          rest_timer: exercise.rest_timer || null,
          exercise_image: null,
          position: idx,
          sets: exercise.sets.map((set, setIdx) => ({
            id: set.id,
            set_number: set.set_number || setIdx + 1,
            reps: set.reps,
            rep_range_min: set.rep_range_min,
            rep_range_max: set.rep_range_max,
            weight: set.weight || 0,
            type: set.type || "Normal",
            checked: false
          }))
        }))
      };
      
      // Pass the transformed workout to openStartWorkoutModal
      openStartWorkoutModal(workoutFromSplit);
      setMiniMize(false);
      localStorage.setItem("miniMize", JSON.stringify(false));
    } else {
      toast.error("No days found in this split");
    }
  };

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
                rep_range_max,
                type
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
    <>
      <AnimatePresence>
        {viewAll && (
          <WiewAllWorkouts
            setViewAll={setViewAll}
            viewAll={viewAll}
            workouts={workouts}
            isLoading={isLoading}
            error={error}
            hoveredWorkout={hoveredWorkout}
            setHoveredWorkout={setHoveredWorkout}
            isMobile={isMobile}
            activeWorkout={activeWorkout}
            openStartWorkoutModal={openStartWorkoutModal}
            setMiniMize={setMiniMize}
          />
        )}
      </AnimatePresence>

      <div className="max-w-[1440px] mx-auto pt-10 space-y-10">
        <div>
          <h2 className="text-orange-600 font-black lg:text-2xl text-lg tracking-tight">
            Workouts
          </h2>
          <p className="lg:text-sm text-xs">Choose a routine or start fresh.</p>
        </div>

        <div>
          <div className="flex w-full flex-col  gap-3">
            {!isLoadingSplit && activeSplit && (
              <motion.div
                className="flex justify-between items-center bg-[#3D348B] h-full rounded-4xl p-5 lg:col-span-3"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div>
                  <h2 className="lg:text-lg text-base tracking-tight font-bold text-white dark:text-accent-foreground">
                    Current Split: {activeSplit.name}
                  </h2>
                  <p className="lg:text-sm text-xs text-white dark:text-accent-foreground">
                    {activeSplit.difficulty} • {activeSplit.days.length}{" "}
                    {activeSplit.days.length === 1 ? "Day" : "Days"}
                  </p>
                </div>
                <motion.div
                  onClick={startSplitWorkout}
                  className="rounded-full p-3 w-fit dark:bg-white bg-accent-foreground cursor-pointer"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Play
                    className="stroke-background fill-background"
                    size={18}
                  />
                </motion.div>
              </motion.div>
            )}

            {/* Loading state for split */}
            {isLoadingSplit && (
              <motion.div className="flex justify-between items-center bg-[#3D348B] h-full rounded-4xl p-5 lg:col-span-3">
                <div>
                  <h2 className="lg:text-lg text-base tracking-tight font-bold text-white dark:text-accent-foreground">
                    Loading split...
                  </h2>
                </div>
              </motion.div>
            )}

            {/* No active split message */}
            {!isLoadingSplit && !activeSplit && (
              <motion.div className="flex justify-between items-center bg-gray-600 h-full rounded-4xl p-5 lg:col-span-3">
                <div>
                  <h2 className="lg:text-lg text-base tracking-tight font-bold text-white dark:text-accent-foreground">
                    No Active Split
                  </h2>
                  <p className="lg:text-sm text-xs text-white dark:text-accent-foreground">
                    Go to Splits to set an active split
                  </p>
                </div>
                <Link to="/dashboard/splits">
                  <motion.div
                    className="rounded-full p-3 w-fit dark:bg-white bg-accent-foreground cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Play
                      className="stroke-background fill-background"
                      size={18}
                    />
                  </motion.div>
                </Link>
              </motion.div>
            )}

            {/* <motion.div
              className="flex justify-between items-center bg-[#3D348B] h-full rounded-4xl p-5 lg:col-span-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div>
                <h2 className="lg:text-lg text-base tracking-tight font-bold text-white dark:text-accent-foreground">
                  Current Split
                </h2>
                <p className="lg:text-sm text-xs text-white dark:text-accent-foreground">
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
            </motion.div> */}

            <div className="flex lg:flex-row flex-col  w-full gap-3">
              <motion.div
                className="flex justify-between items-center bg-orange-600 h-full w-full rounded-4xl p-5"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div>
                  <h2 className="lg:text-lg text-base tracking-tight font-bold text-white dark:text-accent-foreground">
                    Empty Workout
                  </h2>
                  <p className="lg:text-sm text-xs text-white dark:text-accent-foreground">
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
                  <Play
                    className="stroke-background fill-background"
                    size={18}
                  />
                </motion.div>
              </motion.div>

              <Link to={"/dashboard/manage-workouts"} className="w-full">
                <motion.div
                  className="flex justify-between items-center gap-2  bg-[#FAF6FA] dark:bg-[#2d2d2d] h-full rounded-4xl p-5 "
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div>
                    <h2 className="lg:text-lg text-base font-bold tracking-tight">
                      Manage Workout
                    </h2>
                    <p className="lg:text-sm text-xs">
                      Edit your saved workouts
                    </p>
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
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex w-full justify-between items-center">
            <h2 className="font-bold tracking-tight">My workouts</h2>
            {workouts.length > 1 && (
              <p
                className="text-orange-600 lg:text-sm text-xs cursor-pointer"
                onClick={() => setViewAll(!viewAll)}
              >
                View all
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center w-full">
            <div className="w-full">
              {/* Loading State */}
              {isLoading && (
                <p className="text-gray-500 dark:text-gray-400 lg:text-sm text-xs">
                  Loading workouts..
                </p>
              )}
              {/* Error State */}
              {error && !isLoading && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl">
                  <p className="text-red-600 dark:text-red-400 lg:text-sm text-xs">
                    Error: {error}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 lg:text-sm text-xs text-red-600 dark:text-red-400 underline"
                  >
                    Try again
                  </button>
                </div>
              )}
              {/* Workouts List */}
              {!isLoading && !error && workouts.length === 0 && (
                <div className="p-8 text-center bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-3xl">
                  <p className="text-gray-500 dark:text-gray-400 lg:text-sm text-xs">
                    No workouts yet. Create your first workout!
                  </p>
                </div>
              )}
              <div className="lg:grid-cols-2 grid-cols-1 grid gap-3 pb-20">
                {!isLoading &&
                  !error &&
                  workouts.slice(0, 3).map((workout) => {
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
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
