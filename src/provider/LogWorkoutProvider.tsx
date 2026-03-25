import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { Workout, WorkoutExercise, Set, ActiveWorkout } from "@/lib/types";
import supabase from "@/lib/supabase";
// Types for logging context

interface LogWorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  startWorkout: (workout?: Workout) => void;
  endWorkout: () => void;
  addExercise: (exercise: WorkoutExercise) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<Set>) => void;
  elapsedTime: number; // in seconds
  resetWorkout: () => void;

  // Modal handling
  startWorkoutModalOpen: boolean;
  openStartWorkoutModal: (workout?: Workout) => void;
  closeStartWorkoutModal: () => void;
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

  // Modal state

  //   useEffect(() => {
  //     const fetchActiveWorkout = async () => {
  //       const { data, error } = await supabase
  //         .from("workout_sessions")
  //         .select("*")
  //         .eq("status", "in_progress")
  //         .order("started_at", { ascending: false })
  //         .limit(1)
  //         .single();
  //       console.log("🚀 ~ fetchActiveWorkout ~ data:", data)

  //       if (error || !data) return;

  //       setActiveWorkout({
  //         id: data.id,
  //         name: data.name,
  //         startedAt: new Date(data.started_at),
  //         exercises: [], // 🔥 you can expand later with joins
  //       });
  //     };

  //     fetchActiveWorkout();
  //   }, []);

  useEffect(() => {
    const fetchActiveWorkout = async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          name,
          started_at,
          workout_session_exercises (
            id,
            name,
            notes,
            rest_timer,
            order_index,
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
        .single();

      console.log("🚀 FULL WORKOUT:", data);

      if (error || !data) return;

      // 🔥 Transform DB shape → your frontend shape
      const exercises =
        data.workout_session_exercises?.map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          notes: ex.notes,
          rest_timer: ex.rest_timer,
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
      console.log("🚀 ~ fetchActiveWorkout ~ exercises:", exercises);

      setActiveWorkout({
        id: data.id,
        name: data.name,
        startedAt: new Date(data.started_at),
        exercises,
      });
    };

    fetchActiveWorkout();
  }, []);

  const [startWorkoutModalOpen, setStartWorkoutModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timer;
    if (activeWorkout) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkout]);

  //   const startWorkout = async (workout?: Workout) => {
  //     const { data, error } = await supabase
  //       .from("workout_sessions")
  //       .insert([
  //         {
  //           name: workout?.name || "New Workout",
  //           status: "in_progress",
  //         },
  //       ])
  //       .select()
  //       .single();

  //     if (error) {
  //       console.error("Error starting workout:", error);
  //       return;
  //     }

  //     setActiveWorkout({
  //       id: data.id, // 🔥 DB ID
  //       name: data.name,
  //       startedAt: new Date(data.started_at),
  //       exercises: workout?.workout_exercises || [],
  //     });

  //     console.log("Workout started & saved");
  //   };

  const startWorkout = async (workout?: Workout) => {
    // 1. Create session
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .insert([
        {
          name: workout?.name || "New Workout",
          status: "in_progress",
        },
      ])
      .select()
      .single();

    if (error || !session) {
      console.error("Error starting workout:", error);
      return;
    }

    // 2. If template workout exists → clone exercises + sets
    if (workout?.workout_exercises?.length) {
      for (const ex of workout.workout_exercises) {
        // 👉 Insert exercise
        const { data: newExercise, error: exError } = await supabase
          .from("workout_session_exercises")
          .insert([
            {
              workout_session_id: session.id,
              name: ex.name,
              notes: ex.notes,

              rest_timer:
                typeof ex.rest_timer === "number" ? ex.rest_timer : null, // 🔥 fix

              order_index:
                typeof ex.order_index === "number" ? ex.order_index : 0, // 🔥 fallback
            },
          ])
          .select()
          .single();

        if (exError || !newExercise) {
          console.error("Error inserting exercise:", exError);
          continue;
        }

        // 👉 Insert sets
        if (ex.sets?.length) {
          const setsToInsert = ex.sets.map((set) => ({
            exercise_id: newExercise.id,
            set_number: set.set_number,
            reps: set.reps,
            rep_range_min: set.rep_range_min,
            rep_range_max: set.rep_range_max,
            weight: set.weight,
            checked: false, // 🔥 always start unchecked
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

    // 3. Set local state (same as before)
    setActiveWorkout({
      id: session.id,
      name: session.name,
      startedAt: new Date(session.started_at),
      exercises: workout?.workout_exercises || [],
    });

    console.log("Workout fully created (session + exercises + sets)");
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

  const addExercise = (exercise: WorkoutExercise) => {
    if (!activeWorkout) return;
    setActiveWorkout((prev) =>
      prev
        ? {
            ...prev,
            exercises: [...prev.exercises, exercise],
          }
        : prev,
    );
  };

  const updateSet = async (
    exerciseId: string,
    setId: string,
    data: Partial<Set>,
  ) => {
    console.log("updateSet...");
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

    // 🔥 Sync to DB (checked / reps / weight etc)
    const { data:dupdateSetData, error } = await supabase
      .from("workout_sets")
      .update(data)
      .eq("id", setId);


      console.log("workout_setsdata" , dupdateSetData)
    if (error) {
      console.error("Error updating set:", error);
    }
  };

  // Modal handlers
  const openStartWorkoutModal = (workout?: Workout) => {
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
      }}
    >
      {children}
    </LogWorkoutContext.Provider>
  );
};
