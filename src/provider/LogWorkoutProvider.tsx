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
import { toast } from "sonner";

interface LogWorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  startWorkout: (workout?: Workout) => Promise<void>;
  endWorkout: () => Promise<void>;
  addExercise: (exercise: WorkoutExercise) => Promise<void>;
  updateSet: (
    exerciseId: string,
    setId: string,
    data: Partial<Set>,
  ) => Promise<void>;
  elapsedTime: number;
  updateExercise: (exerciseId: string, data: Partial<any>) => void;
  resetWorkout: () => void;
  startWorkoutModalOpen: boolean;
  openStartWorkoutModal: (workout?: Workout | ActiveWorkout) => void;
  closeStartWorkoutModal: () => void;
  removeSet: (exerciseId: string, setId: string) => Promise<void>;
  addSet: (exerciseId: string, newSet: any) => Promise<void>;
  resumeWorkout: () => void;
  forceOpenWorkoutModal: boolean;
  selectedWorkout: Workout | ActiveWorkout | null;
  setForceOpenWorkoutModal: React.Dispatch<React.SetStateAction<boolean>>;
  setMiniMize: React.Dispatch<React.SetStateAction<boolean>>;
  miniMize: boolean;
  handleMinimize: () => void;
  setStartWorkoutModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveWorkout: React.Dispatch<React.SetStateAction<ActiveWorkout | null>>;
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
  const [forceOpenWorkoutModal, setForceOpenWorkoutModal] = useState(false);

  const [miniMize, setMiniMize] = useState<boolean>(() =>
    JSON.parse(localStorage.getItem("miniMize") || "false"),
  );

  // const handleMinimize = () => {
  //   setMiniMize(!miniMize);
  // };

  useEffect(() => {
    if (activeWorkout) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMiniMize(true);
      localStorage.setItem("miniMize", JSON.stringify(true));
    }
  }, [activeWorkout]);

  const handleMinimize = () => {
    setMiniMize((prev) => {
      const next = !prev;
      localStorage.setItem("miniMize", JSON.stringify(next));

      if (!next && activeWorkout) {
        setForceOpenWorkoutModal(true);

        setStartWorkoutModalOpen(true);
      }

      return next;
    });
  };

  useEffect(() => {
    const fetchActiveWorkout = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("No user logged in, skipping fetchActiveWorkout");
        return;
      }

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          name,
          started_at,
          workout_id,
          user_id,
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
        .eq("user_id", user.id) // FILTER BY USER
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
            ex.workout_sets
              ?.sort((a: any, b: any) => a.set_number - b.set_number)
              .map((set: any) => ({
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
        workoutId: data.workout_id ?? null,
        startedAt: new Date(data.started_at),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        exercises,
        isCustom: !data.workout_id,
      });
    };

    fetchActiveWorkout();
  }, []);

  // Realtime subscription with user filter
  useEffect(() => {
    if (!activeWorkout?.id) {
      return;
    }

    let channel: any;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`workout-${activeWorkout.id}-user-${user.id}`)

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workout_sessions",
            filter: `id=eq.${activeWorkout.id}`,
          },
          (payload) => {
            setActiveWorkout((prev) => {
              if (!prev) {
                return prev;
              }
              const updated = { ...prev, ...payload.new };
              return updated;
            });
          },
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workout_session_exercises",
            filter: `workout_session_id=eq.${activeWorkout.id}`,
          },
          (payload) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-expect-error
            setActiveWorkout((prev) => {
              if (!prev) return prev;

              const updatedExerciseFromDB = payload.new || payload.old;

              const existingExercise = prev.exercises.find(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-expect-error
                (ex) => ex.id === updatedExerciseFromDB.id,
              );

              const mergedExercise = {
                ...updatedExerciseFromDB,
                sets: existingExercise?.sets || [],
              };

              const exerciseExists = prev.exercises.some(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-expect-error
                (ex) => ex.id === mergedExercise.id,
              );

              if (!exerciseExists) {
                return prev;
              }

              const exercises = prev.exercises.map((ex) =>
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                ex.id === mergedExercise.id ? mergedExercise : ex,
              );

              return { ...prev, exercises };
            });
          },
        )

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
            // Handle different events
            if (payload.eventType === "DELETE") {
              // Remove the set from local state
              const deletedSet = payload.old;
              setActiveWorkout((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  exercises: prev.exercises.map((ex) => {
                    if (ex.id === deletedSet.exercise_id) {
                      return {
                        ...ex,
                        sets: ex.sets.filter((set) => set.id !== deletedSet.id),
                      };
                    }
                    return ex;
                  }),
                };
              });
            } else {
              // Handle INSERT and UPDATE
              const setUpdate = payload.new;
              setActiveWorkout((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  exercises: prev.exercises.map((ex) => {
                    if (ex.id === setUpdate?.exercise_id) {
                      const setExists = ex.sets?.some(
                        (s: any) => s.id === setUpdate.id,
                      );

                      if (setExists) {
                        // Update existing set
                        return {
                          ...ex,
                          sets: ex.sets?.map((s: any) =>
                            s.id === setUpdate.id ? setUpdate : s,
                          ),
                        };
                      } else {
                        // Add new set
                        return {
                          ...ex,
                          sets: [...(ex.sets || []), setUpdate],
                        };
                      }
                    }
                    return ex;
                  }),
                };
              });
            }
          },
        )

        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            /* empty */
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
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeWorkout?.id, activeWorkout?.exercises]);

  const [startWorkoutModalOpen, setStartWorkoutModalOpen] = useState(false);

  const [selectedWorkout, setSelectedWorkout] = useState<
    Workout | ActiveWorkout | null
  >(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    let interval: NodeJS.Timer;

    if (activeWorkout?.startedAt) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const started = new Date(activeWorkout.startedAt).getTime();

        const seconds = Math.floor((now - started) / 1000);
        setElapsedTime(seconds);
      }, 1000);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkout?.startedAt]);

  // const startWorkout = async (workout?: Workout) => {
  //   const { data: session, error } = await supabase
  //     .from("workout_sessions")
  //     .insert([
  //       {
  //         name: workout?.name || "New Workout",
  //         status: "in_progress",
  //         workout_id: workout?.id || null,
  //       },
  //     ])
  //     .select()
  //     .single();

  //   if (error || !session) {
  //     console.error("Error starting workout:", error);
  //     return;
  //   }

  //   if (workout?.workout_exercises?.length) {
  //     for (const ex of workout.workout_exercises) {
  //       const { data: newExercise, error: exError } = await supabase
  //         .from("workout_session_exercises")
  //         .insert([
  //           {
  //             workout_session_id: session.id,
  //             name: ex.name,
  //             notes: ex.notes,
  //             rest_timer:
  //               typeof ex.rest_timer === "number" ? ex.rest_timer : null,
  //             order_index:
  //               typeof ex.order_index === "number" ? ex.order_index : 0,
  //             exercise_image: ex.exercise_image || null,
  //           },
  //         ])
  //         .select()
  //         .single();

  //       if (exError || !newExercise) {
  //         console.error("Error inserting exercise:", exError);
  //         continue;
  //       }

  //       if (ex.sets?.length) {
  //         const setsToInsert = ex.sets.map((set) => ({
  //           exercise_id: newExercise.id,
  //           set_number: set.set_number,
  //           reps: set.reps,
  //           rep_range_min: set.rep_range_min,
  //           rep_range_max: set.rep_range_max,
  //           weight: set.weight,
  //           checked: false,
  //         }));

  //         const { error: setError } = await supabase
  //           .from("workout_sets")
  //           .insert(setsToInsert);

  //         if (setError) {
  //           console.error("Error inserting sets:", setError);
  //         }
  //       }
  //     }
  //   }

  //   const formattedExercises =
  //     workout?.workout_exercises?.map((ex, index) => ({
  //       id: `temp-${index}`,
  //       name: ex.name,
  //       notes: ex.notes,
  //       rest_timer: ex.rest_timer,
  //       exercise_image: ex.exercise_image || null,
  //       order_index: ex.order_index || 0,
  //       sets:
  //         ex.sets?.map((set, setIndex) => ({
  //           id: `temp-set-${index}-${setIndex}`,
  //           set_number: set.set_number,
  //           reps: set.reps,
  //           rep_range_min: set.rep_range_min,
  //           rep_range_max: set.rep_range_max,
  //           weight: set.weight,
  //           checked: false,
  //         })) || [],
  //     })) || [];

  //   setActiveWorkout({
  //     id: session.id,
  //     name: session.name,
  //     workoutId: workout?.id ?? null,
  //     startedAt: new Date(session.started_at),
  //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //     //@ts-ignore
  //     exercises: formattedExercises,
  //   });
  // };

  // const startWorkout = async (workout?: Workout) => {
  //   const { data: session, error } = await supabase
  //     .from("workout_sessions")
  //     .insert([
  //       {
  //         name: workout?.name || "New Workout",
  //         status: "in_progress",
  //         workout_id: workout?.id || null,
  //       },
  //     ])
  //     .select()
  //     .single();

  //   if (error || !session) {
  //     console.error("Error starting workout:", error);
  //     return;
  //   }

  //   const formattedExercises = [];

  //   if (workout?.workout_exercises?.length) {
  //     for (const ex of workout.workout_exercises) {
  //       const { data: newExercise, error: exError } = await supabase
  //         .from("workout_session_exercises")
  //         .insert([
  //           {
  //             workout_session_id: session.id,
  //             name: ex.name,
  //             notes: ex.notes,
  //             rest_timer:
  //               typeof ex.rest_timer === "number" ? ex.rest_timer : null,
  //             order_index:
  //               typeof ex.order_index === "number" ? ex.order_index : 0,
  //             exercise_image: ex.exercise_image || null,
  //           },
  //         ])
  //         .select()
  //         .single();

  //       if (exError || !newExercise) {
  //         console.error("Error inserting exercise:", exError);
  //         continue;
  //       }

  //       let insertedSets = [];

  //       if (ex.sets?.length) {
  //         const setsToInsert = ex.sets.map((set, setIndex) => ({
  //           exercise_id: newExercise.id,
  //           set_number: set.set_number,
  //           reps: set.reps,
  //           rep_range_min: set.rep_range_min,
  //           rep_range_max: set.rep_range_max,
  //           weight: set.weight,
  //           checked: false,
  //         }));

  //         const { data: sets, error: setError } = await supabase
  //           .from("workout_sets")
  //           .insert(setsToInsert)
  //           .select(); // Add .select() to get the inserted sets with their real UUIDs

  //         if (setError) {
  //           console.error("Error inserting sets:", setError);
  //         } else {
  //           insertedSets = sets || [];
  //         }
  //       }

  //       formattedExercises.push({
  //         id: newExercise.id, // Use the real UUID from the database
  //         name: newExercise.name,
  //         notes: newExercise.notes,
  //         rest_timer: newExercise.rest_timer,
  //         exercise_image: newExercise.exercise_image,
  //         order_index: newExercise.order_index,
  //         sets: insertedSets.map((set) => ({
  //           id: set.id, // Use the real UUID from the database
  //           set_number: set.set_number,
  //           reps: set.reps,
  //           rep_range_min: set.rep_range_min,
  //           rep_range_max: set.rep_range_max,
  //           weight: set.weight,
  //           checked: set.checked,
  //         })),
  //       });
  //     }
  //   }

  //   setActiveWorkout({
  //     id: session.id,
  //     name: session.name,
  //     workoutId: workout?.id ?? null,
  //     startedAt: new Date(session.started_at),
  //     exercises: formattedExercises,
  //   });
  // };

  const startWorkout = async (workout?: Workout) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No user");
      return;
    }

    // 1. Create session
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .insert([
        {
          name: workout?.name || "New Workout",
          status: "in_progress",
          workout_id: workout?.id || null,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error || !session) {
      console.error(error);
      return;
    }

    const formattedExercises = [];

    if (workout?.workout_exercises?.length) {
      for (const ex of workout.workout_exercises) {
        const { data: newExercise } = await supabase
          .from("workout_session_exercises")
          .insert([
            {
              workout_session_id: session.id,
              name: ex.name,
              notes: ex.notes,
              rest_timer: ex.rest_timer, // ✅ Use the rest_timer from workout_exercises
              order_index: ex.order_index || 0,
              exercise_image: ex.exercise_image || null,
            },
          ])
          .select()
          .single();

        if (!newExercise) continue;

        let insertedSets = [];

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

          const { data: sets, error: setError } = await supabase
            .from("workout_sets")
            .insert(setsToInsert)
            .select();

          if (setError) {
            console.error("Error inserting sets:", setError);
          } else {
            insertedSets = sets || [];
          }
        }

        formattedExercises.push({
          id: newExercise.id,
          name: newExercise.name,
          notes: newExercise.notes,
          rest_timer: newExercise.rest_timer, // This will now have the correct value
          exercise_image: newExercise.exercise_image,
          order_index: newExercise.order_index,
          sets: insertedSets.map((set) => ({
            id: set.id,
            set_number: set.set_number,
            reps: set.reps,
            rep_range_min: set.rep_range_min,
            rep_range_max: set.rep_range_max,
            weight: set.weight,
            checked: set.checked,
          })),
        });
      }
    }

    setActiveWorkout({
      id: session.id,
      name: session.name,
      workoutId: workout?.id ?? null,
      startedAt: new Date(session.started_at),
      exercises: formattedExercises,
    });
  };

  const endWorkout = async () => {
    if (!activeWorkout?.id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("workout_sessions")
      .update({
        status: "finished",
        ended_at: new Date(),
      })
      .eq("id", activeWorkout.id)
      .eq("user_id", user.id); 

    toast.success("Well done buddy ✅!");
    setActiveWorkout(null);
    setElapsedTime(0);
    setForceOpenWorkoutModal(false);
    setStartWorkoutModalOpen(false);
  };

  // RESET WORKOUT - WITH USER VERIFICATION
  const resetWorkout = async () => {
    if (!activeWorkout?.id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("workout_sessions")
      .update({
        status: "discarded",
        ended_at: new Date(),
      })
      .eq("id", activeWorkout.id)
      .eq("user_id", user.id);

    setActiveWorkout(null);
    setElapsedTime(0);
    setForceOpenWorkoutModal(false);
    setStartWorkoutModalOpen(false);
  };

  // ADD EXERCISE - WITH USER VERIFICATION (optional but good practice)
  const addExercise = async (exercise: any) => {
    if (!activeWorkout) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const exerciseName =
      exercise.jsonContents?.[0]?.content?.name ||
      exercise.folder?.replace(/_/g, " ") ||
      "Unknown Exercise";

    const firstSet = activeWorkout.exercises?.[0]?.sets?.[0] || null;

    const isRepRange = firstSet ? firstSet.rep_range_min !== null : false;

    const defaultSet = isRepRange
      ? {
          weight: 0,
          reps: null,
          rep_range_min: 8,
          rep_range_max: 12,
          checked: false,
        }
      : {
          weight: 0,
          reps: 0,
          rep_range_min: null,
          rep_range_max: null,
          checked: false,
        };

    const { data: newExercise, error } = await supabase
      .from("workout_session_exercises")
      .insert([
        {
          workout_session_id: activeWorkout.id,
          name: exerciseName,
          notes: exercise.notes || "",
          rest_timer: exercise.rest_timer || null,
          exercise_image: exercise.images?.[0] || null,
          order_index: activeWorkout.exercises.length,
        },
      ])
      .select()
      .single();

    if (error || !newExercise) {
      console.error("Error adding exercise:", error);
      return;
    }

    const { data: insertedSets, error: setError } = await supabase
      .from("workout_sets")
      .insert([
        {
          exercise_id: newExercise.id,
          set_number: 1,
          weight: defaultSet.weight,
          reps: defaultSet.reps,
          rep_range_min: defaultSet.rep_range_min,
          rep_range_max: defaultSet.rep_range_max,
          checked: false,
        },
      ])
      .select();

    if (setError) {
      console.error("Error inserting sets:", setError);
      return;
    }

    setActiveWorkout((prev: any) => {
      if (!prev) return prev;

      const exists = prev.exercises.some((ex: any) => ex.id === newExercise.id);

      if (exists) return prev;

      return {
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            ...newExercise,
            sets: insertedSets || [],
          },
        ],
      };
    });

    toast.success("Exercise added! ");
  };

  // ADD SET
  const addSet = async (exerciseId: string, newSet: any) => {
    if (!activeWorkout) return;

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

    setActiveWorkout((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;

          const setExists = exercise.sets?.some(
            (set: any) => set.id === createdSet.id,
          );

          if (setExists) {
            return exercise;
          }

          return {
            ...exercise,
            sets: [...(exercise.sets || []), createdSet],
          };
        }),
      };
    });

    toast.success("Set added! ");
  };

  // REMOVE SET
  const removeSet = async (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    const { error } = await supabase
      .from("workout_sets")
      .delete()
      .eq("id", setId);

    if (error) {
      console.error("Error deleting set from database:", error);
      return;
    }

    const exercise = activeWorkout.exercises.find((ex) => ex.id === exerciseId);

    if (!exercise) return;

    const filtered = exercise.sets.filter((set) => set.id !== setId);

    for (let i = 0; i < filtered.length; i++) {
      await supabase
        .from("workout_sets")
        .update({ set_number: i + 1 })
        .eq("id", filtered[i].id);
    }

    setActiveWorkout((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;

          const renumbered = filtered.map((set, index) => ({
            ...set,
            set_number: index + 1,
          }));

          return {
            ...ex,
            sets: renumbered,
          };
        }),
      };
    });
  };

  // UPDATE SET
  const updateSet = async (
    exerciseId: string,
    setId: string,
    data: Partial<Set>,
  ) => {
    if (!activeWorkout) return;

    // Update locally
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

    toast.success("Done ✅!");
  };

  const openStartWorkoutModal = (workout?: Workout | ActiveWorkout) => {
    setSelectedWorkout(workout || null);
    setStartWorkoutModalOpen(true);
  };

  const closeStartWorkoutModal = () => {
    setSelectedWorkout(null);
    setStartWorkoutModalOpen(false);
  };

  const resumeWorkout = () => {
    if (!activeWorkout) return;

    setForceOpenWorkoutModal(true);
    setSelectedWorkout(activeWorkout);
  };

  const updateExercise = async (exerciseId: string, data: Partial<any>) => {
    if (!activeWorkout) return;

    // Update locally first
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                ...data,
              }
            : ex,
        ),
      };
    });

    // Update in database
    const { error } = await supabase
      .from("workout_session_exercises")
      .update(data)
      .eq("id", exerciseId);

    if (error) {
      console.error("Error updating exercise:", error);
    }
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
        resumeWorkout,
        forceOpenWorkoutModal,
        setForceOpenWorkoutModal,
        handleMinimize,
        setMiniMize,
        miniMize,
        setStartWorkoutModalOpen,
        updateExercise,
      }}
    >
      {children}
    </LogWorkoutContext.Provider>
  );
};
