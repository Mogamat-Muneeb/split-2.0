/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Workout, WorkoutExercise, Set, ActiveWorkout } from "@/lib/types";
import supabase from "@/lib/supabase";

interface LogWorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  startWorkout: (workout?: Workout) => void;
  endWorkout: () => void;
  addExercise: (exercise: WorkoutExercise) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<Set>) => void;
  elapsedTime: number;
  resetWorkout: () => void;
  startWorkoutModalOpen: boolean;
  openStartWorkoutModal: (workout?: Workout | ActiveWorkout) => void;
  closeStartWorkoutModal: () => void;
  removeSet: () => void;
  addSet: () => void;
  selectedWorkout: Workout | null;
}

const LogWorkoutContext = createContext<LogWorkoutContextType | undefined>(
  undefined,
);

// eslint-disable-next-line react-refresh/only-export-components
export const useLogWorkout = () => {
  const context = useContext(LogWorkoutContext);
  if (!context) {
    throw new Error("useLogWorkout must be used within a LogWorkoutProvider");
  }
  return context;
};

export const LogWorkoutProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(
    null,
  );
  const [elapsedTime, setElapsedTime] = useState(0);

  console.log("activeWorkout 🍆" , activeWorkout)

  useEffect(() => {
    const fetchActiveWorkout = async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          name,
          started_at,
          workout_id,
          workout_session_exercises (
            id,
            name,
            notes,
            rest_timer,
            order_index,
            exercise_image,
            workout_sets (
              id,
              set_number,
              reps,
              rep_range_min,
              rep_range_max,
              weight,
              checked
            )
          )
        `,
        )
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      const exercises =
        data.workout_session_exercises?.map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          notes: ex.notes,
          rest_timer: ex.rest_timer,
          exercise_image: ex.exercise_image || null,
          sets:
            ex.workout_sets?.map((set: any) => ({
              id: set.id,
              set_number: set.set_number,
              reps: set.reps,
              rep_range_min: set.rep_range_min,
              rep_range_max: set.rep_range_max,
              weight: set.weight,
              checked: set.checked,
            })) || [],
        })) || [];

      setActiveWorkout({
        id: data.id,
        name: data.name,
        workoutId: data.workout_id,
        startedAt: new Date(data.started_at),
        exercises,
      });
    };

    fetchActiveWorkout();
  }, []);

  useEffect(() => {
    if (!activeWorkout?.id) {
      console.log(
        "[Workout Realtime] No active workout ID, skipping subscription",
      );
      return;
    }

    console.log(
      `[Workout Realtime] Setting up subscription for workout: ${activeWorkout.id}`,
    );
    console.log(
      "[Workout Realtime] Current exercises:",
      activeWorkout.exercises.map((e) => ({ id: e.id, name: e.name })),
    );

    // Subscribe to changes on the workout session itself
    const channel = supabase
      .channel(`workout-${activeWorkout.id}`)

      // Workout session updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_sessions",
          filter: `id=eq.${activeWorkout.id}`,
        },
        (payload) => {
          console.log("[Workout Realtime] Workout session update received:", {
            event: payload.eventType,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString(),
          });

          setActiveWorkout((prev) => {
            if (!prev) {
              console.log(
                "[Workout Realtime] No previous workout state, skipping update",
              );
              return prev;
            }
            const updated = { ...prev, ...payload.new };
            console.log("[Workout Realtime] Updated workout state:", updated);
            return updated;
          });
        },
      )

      // Exercise updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_session_exercises",
          filter: `workout_session_id=eq.${activeWorkout.id}`,
        },
        (payload) => {
          console.log("[Workout Realtime] Exercise update received:", {
            event: payload.eventType,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString(),
          });

          setActiveWorkout((prev) => {
            if (!prev) {
              console.log(
                "[Workout Realtime] No previous workout state, skipping exercise update",
              );
              return prev;
            }

            const updatedExercise = payload.new || payload.old;
            console.log(
              "[Workout Realtime] Processing exercise:",
              updatedExercise,
            );

            const exercises = prev.exercises.filter(
              (ex) => ex.id !== updatedExercise.id,
            );
            const newExercises = [...exercises, updatedExercise];

            console.log("[Workout Realtime] Updated exercises count:", {
              previous: prev.exercises.length,
              new: newExercises.length,
              exerciseId: updatedExercise.id,
            });

            return { ...prev, exercises: newExercises };
          });
        },
      )

      // Set updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_sets",
          filter: `exercise_id=in.(${activeWorkout.exercises
            .map((ex) => ex.id)
            .join(",")})`,
        },
        (payload) => {
          const setUpdate = payload.new || payload.old;
          console.log("[Workout Realtime] Set update received:", {
            event: payload.eventType,
            set: setUpdate,
            exerciseId: setUpdate.exercise_id,
            timestamp: new Date().toISOString(),
          });

          setActiveWorkout((prev) => {
            if (!prev) {
              console.log(
                "[Workout Realtime] No previous workout state, skipping set update",
              );
              return prev;
            }

            console.log(
              "[Workout Realtime] Finding exercise for set:",
              setUpdate?.exercise_id,
            );

            const exercises = prev.exercises.map((ex) => {
              if (ex.id === setUpdate?.exercise_id) {
                console.log(
                  "[Workout Realtime] Updating sets for exercise:",
                  ex.name,
                  {
                    previousSetCount: ex?.sets?.length,
                    updatedSetId: setUpdate.id,
                  },
                );

                const updatedSets = ex?.sets
                  .filter((s) => s.id !== setUpdate.id)
                  .concat(setUpdate);

                console.log(
                  "[Workout Realtime] New set count:",
                  updatedSets.length,
                );

                return {
                  ...ex,
                  sets: updatedSets,
                };
              }
              return ex;
            });

            return { ...prev, exercises };
          });
        },
      )

      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(
            `[Workout Realtime] Successfully subscribed to workout ${activeWorkout.id}`,
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            `[Workout Realtime] Subscription error for workout ${activeWorkout.id}:`,
            err,
          );
        } else if (status === "TIMED_OUT") {
          console.warn(
            `[Workout Realtime] Subscription timed out for workout ${activeWorkout.id}`,
          );
        }
      });

    return () => {
      console.log(
        `[Workout Realtime] Cleaning up subscription for workout ${activeWorkout.id}`,
      );
      supabase.removeChannel(channel);
    };
  }, [activeWorkout?.id, activeWorkout?.exercises]);

  const [startWorkoutModalOpen, setStartWorkoutModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<
    Workout | ActiveWorkout | null
  >(null);

  useEffect(() => {
    let interval: NodeJS.Timer;
    if (activeWorkout) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsedTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkout]);

  const startWorkout = async (workout?: Workout) => {
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .insert([
        {
          name: workout?.name || "New Workout",
          status: "in_progress",
          workout_id: workout?.id || null,
        },
      ])
      .select()
      .single();

    if (error || !session) {
      console.error("Error starting workout:", error);
      return;
    }

    if (workout?.workout_exercises?.length) {
      for (const ex of workout.workout_exercises) {
        const { data: newExercise, error: exError } = await supabase
          .from("workout_session_exercises")
          .insert([
            {
              workout_session_id: session.id,
              name: ex.name,
              notes: ex.notes,
              rest_timer:
                typeof ex.rest_timer === "number" ? ex.rest_timer : null,
              order_index:
                typeof ex.order_index === "number" ? ex.order_index : 0,
              exercise_image: ex.exercise_image || null,
            },
          ])
          .select()
          .single();

        if (exError || !newExercise) {
          console.error("Error inserting exercise:", exError);
          continue;
        }

        if (ex.sets?.length) {
          const setsToInsert = ex.sets.map((set) => ({
            exercise_id: newExercise.id,
            set_number: set.set_number,
            reps: set.reps,
            rep_range_min: set.rep_range_min,
            rep_range_max: set.rep_range_max,
            weight: set.weight,
            checked: false,
          }));

          const { error: setError } = await supabase
            .from("workout_sets")
            .insert(setsToInsert);

          if (setError) {
            console.error("Error inserting sets:", setError);
          }
        }
      }
    }

    const formattedExercises =
      workout?.workout_exercises?.map((ex, index) => ({
        id: `temp-${index}`,
        name: ex.name,
        notes: ex.notes,
        rest_timer: ex.rest_timer,
        exercise_image: ex.exercise_image || null,
        order_index: ex.order_index || 0,
        sets:
          ex.sets?.map((set, setIndex) => ({
            id: `temp-set-${index}-${setIndex}`,
            set_number: set.set_number,
            reps: set.reps,
            rep_range_min: set.rep_range_min,
            rep_range_max: set.rep_range_max,
            weight: set.weight,
            checked: false,
          })) || [],
      })) || [];

    setActiveWorkout({
      id: session.id,
      name: session.name,
      workoutId: workout?.id || `temp-${Date.now()}`,
      startedAt: new Date(session.started_at),
      exercises: formattedExercises,
    });
  };
  const endWorkout = async () => {
    if (!activeWorkout?.id) return;

    await supabase
      .from("workout_sessions")
      .update({
        status: "finished",
        ended_at: new Date(),
      })
      .eq("id", activeWorkout.id);

    setActiveWorkout(null);
    setElapsedTime(0);
  };

  const resetWorkout = async () => {
    if (!activeWorkout?.id) return;

    await supabase
      .from("workout_sessions")
      .update({
        status: "discarded",
        ended_at: new Date(),
      })
      .eq("id", activeWorkout.id);

    setActiveWorkout(null);
    setElapsedTime(0);
  };

  // const addExercise = (exercise: WorkoutExercise) => {
  //   if (!activeWorkout) return;
  //   setActiveWorkout((prev) =>
  //     prev
  //       ? {
  //           ...prev,
  //           exercises: [...prev.exercises, exercise],
  //         }
  //       : prev,
  //   );
  // };

  // const addExercise = async (exercise: WorkoutExercise) => {
  //   if (!activeWorkout) return;

  //   // Insert the exercise into the database
  //   const { data: newExercise, error } = await supabase
  //     .from("workout_session_exercises")
  //     .insert([
  //       {
  //         workout_session_id: activeWorkout.id,
  //         name: exercise.name,
  //         notes: exercise.notes,
  //         rest_timer: exercise.rest_timer,
  //         exercise_image: exercise.exercise_image,
  //         order_index: activeWorkout.exercises.length,
  //       },
  //     ])
  //     .select()
  //     .single();

  //   if (error || !newExercise) {
  //     console.error("Error adding exercise:", error);
  //     return;
  //   }

  //   // Insert sets for the exercise
  //   const setsToInsert = exercise.sets.map((set, index) => ({
  //     exercise_id: newExercise.id,
  //     set_number: index + 1,
  //     weight: set.weight,
  //     reps: set.reps,
  //     rep_range_min: set.rep_range_min,
  //     rep_range_max: set.rep_range_max,
  //     checked: false,
  //   }));

  //   const { error: setError } = await supabase
  //     .from("workout_sets")
  //     .insert(setsToInsert);

  //   if (setError) {
  //     console.error("Error inserting sets:", setError);
  //     return;
  //   }

  //   // Update local state with the new exercise (with real IDs)
  //   setActiveWorkout((prev) =>
  //     prev
  //       ? {
  //           ...prev,
  //           exercises: [
  //             ...prev.exercises,
  //             {
  //               ...exercise,
  //               id: newExercise.id,
  //               sets: setsToInsert.map((set, index) => ({
  //                 ...set,
  //                 id: `temp-${Date.now()}-${index}`,
  //               })),
  //             },
  //           ],
  //         }
  //       : prev
  //   );
  // };

  const addExercise = async (exercise: WorkoutExercise) => {
    if (!activeWorkout) return;

    // Insert the exercise into the database
    const { data: newExercise, error } = await supabase
      .from("workout_session_exercises")
      .insert([
        {
          workout_session_id: activeWorkout.id,
          name: exercise.name,
          notes: exercise.notes,
          rest_timer: exercise.rest_timer,
          exercise_image: exercise.exercise_image,
          order_index: activeWorkout.exercises.length,
        },
      ])
      .select()
      .single();

    if (error || !newExercise) {
      console.error("Error adding exercise:", error);
      return;
    }

    // Insert sets for the exercise and get the returned data
    const setsToInsert = exercise.sets.map((set, index) => ({
      exercise_id: newExercise.id,
      set_number: index + 1,
      weight: set.weight,
      reps: set.reps,
      rep_range_min: set.rep_range_min,
      rep_range_max: set.rep_range_max,
      checked: false,
    }));

    const { data: insertedSets, error: setError } = await supabase
      .from("workout_sets")
      .insert(setsToInsert)
      .select(); // Add .select() to get the inserted data with real IDs

    if (setError) {
      console.error("Error inserting sets:", setError);
      return;
    }

    // Update local state with the new exercise and its sets (with real IDs)
    setActiveWorkout((prev) =>
      prev
        ? {
            ...prev,
            exercises: [
              ...prev.exercises,
              {
                ...exercise,
                id: newExercise.id,
                sets: insertedSets, // Use the real sets from the database
              },
            ],
          }
        : prev,
    );
  };

  const addSet = async (exerciseId: string, newSet: any) => {
    if (!activeWorkout) return;

    // Insert into database first to get a real ID
    const { data: createdSet, error } = await supabase
      .from("workout_sets")
      .insert({
        exercise_id: exerciseId,
        set_number: newSet.set_number,
        weight: newSet.weight,
        reps: newSet.reps,
        rep_range_min: newSet.rep_range_min,
        rep_range_max: newSet.rep_range_max,
        checked: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding set:", error);
      return;
    }

    // Update local state with the real set from database
    setActiveWorkout((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;

          return {
            ...exercise,
            sets: [...exercise.sets, createdSet],
          };
        }),
      };
    });
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;

          return {
            ...exercise,
            sets: exercise.sets.filter((set) => set.id !== setId),
          };
        }),
      };
    });
  };

  // const updateSet = async (
  //   exerciseId: string,
  //   setId: string,
  //   data: Partial<Set>,
  // ) => {
  //   if (!activeWorkout) return;

  //   // 🔥 Update locally
  //   setActiveWorkout((prev) => {
  //     if (!prev) return prev;
  //     return {
  //       ...prev,
  //       exercises: prev.exercises.map((ex) =>
  //         ex.id === exerciseId
  //           ? {
  //               ...ex,
  //               sets: ex.sets.map((s) =>
  //                 s.id === setId
  //                   ? {
  //                       ...s,
  //                       ...data,
  //                     }
  //                   : s,
  //               ),
  //             }
  //           : ex,
  //       ),
  //     };
  //   });

  //   const { data: dupdateSetData, error } = await supabase
  //     .from("workout_sets")
  //     .update(data)
  //     .eq("id", setId);

  //   if (error) {
  //     console.error("Error updating set:", error);
  //   }
  // };

  const updateSet = async (
    exerciseId: string,
    setId: string,
    data: Partial<Set>,
  ) => {
    if (!activeWorkout) return;

    // 🔥 Update locally
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setId
                    ? {
                        ...s,
                        ...data,
                      }
                    : s,
                ),
              }
            : ex,
        ),
      };
    });

    const { error } = await supabase
      .from("workout_sets")
      .update(data)
      .eq("id", setId);

    if (error) {
      console.error("Error updating set:", error);
    }
  };

  const openStartWorkoutModal = (workout?: Workout | ActiveWorkout) => {
    setSelectedWorkout(workout || null);
    setStartWorkoutModalOpen(true);
  };

  const closeStartWorkoutModal = () => {
    setSelectedWorkout(null);
    setStartWorkoutModalOpen(false);
  };

  return (
    <LogWorkoutContext.Provider
      value={{
        activeWorkout,
        startWorkout,
        endWorkout,
        addExercise,
        updateSet,
        elapsedTime,
        resetWorkout,

        startWorkoutModalOpen,
        openStartWorkoutModal,
        closeStartWorkoutModal,
        selectedWorkout,
        addSet,
        removeSet,
      }}
    >
      {children}
    </LogWorkoutContext.Provider>
  );
};
