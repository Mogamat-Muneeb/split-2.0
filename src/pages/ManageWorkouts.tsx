/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import CreateWorkoutModal from "@/components/create-workout-modal";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabase";
import type { Workout } from "@/lib/types";
import React, { useEffect, useState, useCallback, useRef } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { motion, AnimatePresence } from "framer-motion";
import { EllipsisVertical, AlertTriangle, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

const ManageWorkouts = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [hoveredWorkout, setHoveredWorkout] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<Workout | null>(null);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const navigate = useNavigate();
  const isInitialMount = useRef(true);
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1019);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Function to fetch complete workout data including exercises and sets
  const fetchCompleteWorkoutData = async (userId: string) => {
    // First fetch all workouts
    const { data: workoutsData, error: workoutsError } = await supabase
      .from("workouts")
      .select(
        `
        id,
        name,
        created_at
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (workoutsError) throw workoutsError;
    if (!workoutsData) return [];

    // Then fetch all workout_exercises for these workouts
    const workoutIds = workoutsData.map((w) => w.id);

    const { data: exercisesData, error: exercisesError } = await supabase
      .from("workout_exercises")
      .select(
        `
        id,
        workout_id,
        exercise_id,
        name,
        notes,
        rest_timer,
        position,
        exercise_image
      `,
      )
      .in("workout_id", workoutIds)
      .order("position", { ascending: true });

    if (exercisesError) throw exercisesError;

    // Then fetch all sets for these exercises
    const exerciseIds = exercisesData?.map((e) => e.id) || [];

    const { data: setsData, error: setsError } = await supabase
      .from("sets")
      .select(
        `
        id,
        workout_exercise_id,
        set_number,
        weight,
        reps,
        rep_range_min,
        rep_range_max
      `,
      )
      .in("workout_exercise_id", exerciseIds)
      .order("set_number", { ascending: true });

    if (setsError) throw setsError;

    // Combine the data
    const exercisesWithSets =
      exercisesData?.map((exercise) => ({
        ...exercise,
        sets:
          setsData?.filter((set) => set.workout_exercise_id === exercise.id) ||
          [],
      })) || [];

    const completeWorkouts = workoutsData.map((workout) => ({
      ...workout,
      workout_exercises: exercisesWithSets.filter(
        (ex) => ex.workout_id === workout.id,
      ),
    }));

    return completeWorkouts;
  };

  // Function to refetch a specific workout's data
  const refetchWorkout = useCallback(
    async (workoutId: string, userId: string) => {
      // Prevent duplicate processing
      if (processingRef.current.has(workoutId)) {
        return null;
      }

      processingRef.current.add(workoutId);

      try {
        // Fetch the workout
        const { data: workoutData, error: workoutError } = await supabase
          .from("workouts")
          .select(
            `
          id,
          name,
          created_at
        `,
          )
          .eq("id", workoutId)
          .eq("user_id", userId)
          .single();

        if (workoutError) throw workoutError;

        // Fetch exercises for this workout
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("workout_exercises")
          .select(
            `
          id,
          workout_id,
          exercise_id,
          name,
          notes,
          rest_timer,
          position,
          exercise_image
        `,
          )
          .eq("workout_id", workoutId)
          .order("position", { ascending: true });

        if (exercisesError) throw exercisesError;

        // Fetch sets for these exercises
        const exerciseIds = exercisesData?.map((e) => e.id) || [];

        const { data: setsData, error: setsError } = await supabase
          .from("sets")
          .select(
            `
          id,
          workout_exercise_id,
          set_number,
          weight,
          reps,
          rep_range_min,
          rep_range_max
        `,
          )
          .in("workout_exercise_id", exerciseIds)
          .order("set_number", { ascending: true });

        if (setsError) throw setsError;

        // Combine the data
        const exercisesWithSets =
          exercisesData?.map((exercise) => ({
            ...exercise,
            sets:
              setsData?.filter(
                (set) => set.workout_exercise_id === exercise.id,
              ) || [],
          })) || [];

        return {
          ...workoutData,
          workout_exercises: exercisesWithSets,
        };
      } finally {
        processingRef.current.delete(workoutId);
      }
    },
    [],
  );

  useEffect(() => {
    let workoutsSubscription: any;
    let workoutExercisesSubscription: any;
    let setsSubscription: any;

    const fetchWorkouts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const workoutsData = await fetchCompleteWorkoutData(user.id);
        setWorkouts(workoutsData as unknown as Workout[]);
        isInitialMount.current = false;

        // Subscribe to workouts table
        workoutsSubscription = supabase
          .channel(`public:workouts:user_id=eq.${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workouts",
              filter: `user_id=eq.${user.id}`,
            },
            async (payload) => {
              if (payload.eventType === "INSERT") {
                // Check if workout already exists to prevent duplicates
                setWorkouts((prev) => {
                  const exists = prev.some((w) => w.id === payload.new.id);
                  if (exists) return prev;

                  // Create a temporary workout object with empty exercises
                  // We'll fetch the complete data separately
                  const tempWorkout = {
                    id: payload.new.id,
                    name: payload.new.name,
                    created_at: payload.new.created_at,
                    workout_exercises: [],
                  } as unknown as Workout;

                  return [tempWorkout, ...prev];
                });

                // Then fetch complete data for the new workout
                try {
                  const completeWorkout = await refetchWorkout(
                    payload.new.id,
                    user.id,
                  );
                  if (completeWorkout) {
                    setWorkouts((prev) =>
                      prev.map((w) =>
                        w.id === payload.new.id
                          ? (completeWorkout as unknown as Workout)
                          : w,
                      ),
                    );
                  }
                } catch (err) {
                  console.error("Failed to fetch complete workout data:", err);
                }
              } else if (payload.eventType === "UPDATE") {
                // Refetch the updated workout to get complete data
                try {
                  const updatedWorkout = await refetchWorkout(
                    payload.new.id,
                    user.id,
                  );
                  if (updatedWorkout) {
                    setWorkouts((prev) =>
                      prev.map((w) =>
                        w.id === payload.new.id
                          ? (updatedWorkout as unknown as Workout)
                          : w,
                      ),
                    );
                  }
                } catch (err) {
                  console.error("Failed to refetch updated workout:", err);
                }
              } else if (payload.eventType === "DELETE") {
                setWorkouts((prev) =>
                  prev.filter((w) => w.id !== payload.old.id),
                );
              }
            },
          )
          .subscribe();

        // Subscribe to workout_exercises table
        workoutExercisesSubscription = supabase
          .channel(`public:workout_exercises`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workout_exercises",
            },
            async (payload) => {
              // Refetch the affected workout when exercises change

              const workoutId =
                //@ts-expect-error
                payload.new?.workout_id || payload.old?.workout_id;
              if (workoutId) {
                try {
                  const updatedWorkout = await refetchWorkout(
                    workoutId,
                    user.id,
                  );
                  if (updatedWorkout) {
                    setWorkouts((prev) =>
                      prev.map((w) =>
                        w.id === workoutId
                          ? (updatedWorkout as unknown as Workout)
                          : w,
                      ),
                    );
                  }
                } catch (err) {
                  console.error(
                    "Failed to refetch workout after exercise change:",
                    err,
                  );
                }
              }
            },
          )
          .subscribe();

        // Subscribe to sets table
        setsSubscription = supabase
          .channel(`public:sets`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "sets",
            },
            async (payload) => {
              // When sets change, we need to find which workout_exercise and then which workout

              const workoutExerciseId =
                //@ts-expect-error
                payload.new?.workout_exercise_id ||
                //@ts-expect-error
                payload.old?.workout_exercise_id;
              if (workoutExerciseId) {
                // First get the workout_exercise to find the workout_id
                const { data: workoutExercise, error: weError } = await supabase
                  .from("workout_exercises")
                  .select("workout_id")
                  .eq("id", workoutExerciseId)
                  .single();

                if (weError) {
                  console.error("Error fetching workout_exercise:", weError);
                  return;
                }

                if (workoutExercise?.workout_id) {
                  try {
                    const updatedWorkout = await refetchWorkout(
                      workoutExercise.workout_id,
                      user.id,
                    );
                    if (updatedWorkout) {
                      setWorkouts((prev) =>
                        prev.map((w) =>
                          w.id === workoutExercise.workout_id
                            ? (updatedWorkout as unknown as Workout)
                            : w,
                        ),
                      );
                    }
                  } catch (err) {
                    console.error(
                      "Failed to refetch workout after set change:",
                      err,
                    );
                  }
                }
              }
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
      if (workoutsSubscription) supabase.removeChannel(workoutsSubscription);
      if (workoutExercisesSubscription)
        supabase.removeChannel(workoutExercisesSubscription);
      if (setsSubscription) supabase.removeChannel(setsSubscription);
    };
  }, [refetchWorkout]);

  const openModal = () => {
    setWorkoutToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (workout: Workout) => {
    setWorkoutToEdit(workout);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setWorkoutToEdit(null);
  };

  const handleDeleteClick = (workout: Workout, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkoutToDelete(workout);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete) return;

    try {
      setIsDeleting(true);

      const { data: workoutExercises } = await supabase
        .from("workout_exercises")
        .select("id")
        .eq("workout_id", workoutToDelete.id);

      if (workoutExercises && workoutExercises.length > 0) {
        const exerciseIds = workoutExercises.map((we) => we.id);

        const { error: setsError } = await supabase
          .from("sets")
          .delete()
          .in("workout_exercise_id", exerciseIds);

        if (setsError) throw setsError;
      }

      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", workoutToDelete.id);

      if (exercisesError) throw exercisesError;

      const { error: workoutError } = await supabase
        .from("workouts")
        .delete()
        .eq("id", workoutToDelete.id);

      if (workoutError) throw workoutError;

      setIsConfirmModalOpen(false);
      setWorkoutToDelete(null);
    } catch (err) {
      console.error("Failed to delete workout:", err);
      setError(err instanceof Error ? err.message : "Failed to delete workout");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmModalOpen(false);
    setWorkoutToDelete(null);
  };

  return (
    <div className="max-w-[1440px] mx-auto pt-10 space-y-10">
      <div className="flex items-center justify-between ">
        <div className=" flex items-center gap-1">
          <div onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={18} />
          </div>
          <h2 className="text-orange-600 font-black lg:text-2xl text-lg tracking-tight">
            Manage workouts
          </h2>
        </div>
        <Button
          onClick={openModal}
          className="hover:bg-orange-700 bg-orange-600 text-foreground"
        >
          New Workout
        </Button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <CreateWorkoutModal
            closeModal={closeModal}
            workoutToEdit={workoutToEdit}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#2d2d2d] rounded-3xl  border-0 shadow-xl p-6 m-4 ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to delete the workout "
              {workoutToDelete?.name}"? This action cannot be undone and will
              permanently delete:
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2">
            <Button onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-600"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Workout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex items-center w-full">
        <div className="w-full">
          {isLoading && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Loading workouts..
            </p>
          )}

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

          {!isLoading && !error && workouts.length === 0 && (
            <div className="p-8 text-center bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-3xl">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No workouts yet. Create your first workout!
              </p>
            </div>
          )}

          <div className="lg:grid-cols-2 grid-cols-1 grid gap-4">
            {!isLoading &&
              !error &&
              workouts.map((workout) => {
                const isHovered = hoveredWorkout === workout.id;

                return (
                  <motion.div
                    key={workout.id}
                    className="p-4 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-3xl mb-2 flex items-start justify-between"
                    onHoverStart={() =>
                      !isMobile && setHoveredWorkout(workout.id)
                    }
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    onClick={() => openEditModal(workout)}
                  >
                    <div className="w-full flex flex-col">
                      <h3 className="lg:flex hidden font-bold tracking-tight truncate">
                        {workout.name}
                      </h3>

                      <h3 className="flex lg:hidden font-bold tracking-tight truncate">
                        {workout.name.length > 15
                          ? `${workout.name.slice(0, 15)}...`
                          : workout.name}
                      </h3>

                      <div className="mt-3 flex items-center text-sm">
                        <p className="mr-1 whitespace-nowrap">
                          {workout?.workout_exercises?.length} Exercises •
                        </p>
                        <p className="truncate">
                          {workout?.workout_exercises &&
                            workout?.workout_exercises
                              .slice(0, 2)
                              ?.map((exercise) => exercise.name)
                              .join(", ")}
                          {workout?.workout_exercises &&
                            workout?.workout_exercises?.length > 2 &&
                            " ..."}
                        </p>
                      </div>
                    </div>
                    <div>
                      {isMobile ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            className=" w-fit cursor-pointer"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            whileHover={{ scale: 1.1 }}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <EllipsisVertical
                                  size={18}
                                  className="cursor-pointer"
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                className="w-40"
                                align="start"
                              >
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={(e) =>
                                      handleDeleteClick(workout, e)
                                    }
                                  >
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </motion.div>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {isHovered && (
                            <div className="flex items-center gap-2">
                              <motion.div
                                className=" w-fit cursor-pointer"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <EllipsisVertical
                                      size={18}
                                      className="cursor-pointer"
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    className="w-40"
                                    align="start"
                                  >
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem
                                        onClick={(e) =>
                                          handleDeleteClick(workout, e)
                                        }
                                      >
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </motion.div>
                            </div>
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
  );
};

export default ManageWorkouts;
