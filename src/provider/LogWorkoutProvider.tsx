import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import type { Workout, WorkoutExercise, Set, ActiveWorkout } from "@/lib/types";

// Types for logging context


interface LogWorkoutContextType {
    activeWorkout: ActiveWorkout | null;
    startWorkout: (workout?: Workout) => void;
    endWorkout: () => void;
    addExercise: (exercise: WorkoutExercise) => void;
    updateSet: (
        exerciseId: string,
        setId: string,
        data: Partial<Set>
    ) => void;
    elapsedTime: number; // in seconds
    resetWorkout: () => void;

    // Modal handling
    startWorkoutModalOpen: boolean;
    openStartWorkoutModal: (workout?: Workout) => void;
    closeStartWorkoutModal: () => void;
    selectedWorkout: Workout | null;
}

const LogWorkoutContext = createContext<LogWorkoutContextType | undefined>(
    undefined
);

export const useLogWorkout = () => {
    const context = useContext(LogWorkoutContext);
    if (!context) {
        throw new Error(
            "useLogWorkout must be used within a LogWorkoutProvider"
        );
    }
    return context;
};

export const LogWorkoutProvider = ({ children }: { children: ReactNode }) => {
    const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(
        null
    );
    const [elapsedTime, setElapsedTime] = useState(0);

    // Modal state
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

    const startWorkout = (workout?: Workout) => {

        if (workout) {
            // Start logging an existing workout
            setActiveWorkout({
                id: workout.id,
                name: workout.name,
                startedAt: new Date(),
                exercises: workout.workout_exercises || [],
            });
        } else {
            // Start an empty workout
            setActiveWorkout({
                name: "New Workout",
                startedAt: new Date(),
                exercises: [],
            });
        }

        // Close modal automatically when workout starts
        // closeStartWorkoutModal();

        console.log("We are starting workout")
    };

    const endWorkout = () => {
        // Could call supabase here to save the activeWorkout
        setActiveWorkout(null);
        setElapsedTime(0);
    };

    const resetWorkout = () => {
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
                : prev
        );
    };

    const updateSet = (
        exerciseId: string,
        setId: string,
        data: Partial<Set>
    ) => {
        if (!activeWorkout) return;
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
                                    : s
                            ),
                        }
                        : ex
                ),
            };
        });
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