import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import type { Workout } from "@/lib/types";
import LoggingWorkout from "./logging-workout";

interface LogWorkoutModalProps {
    open: boolean;
    onClose: () => void;
    workout?: Workout;
}

const LogWorkoutModal: React.FC<LogWorkoutModalProps> = ({ open, onClose, workout }) => {
    const { startWorkout, activeWorkout, resetWorkout } = useLogWorkout();

    const handleStart = () => {
        startWorkout(workout);

    };

    if (!open) return null;

    return (
        <>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/20 z-40"
            />


            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
                <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-6 m-4">
                    <h2 className="tracking-tight font-bold text-orange-600">
                        {workout ? `Start ${workout.name}` : "Start New Workout"}
                    </h2>

                    <div className="mt-4 max-h-[50vh] overflow-y-auto">
                        {activeWorkout ? (
                            activeWorkout.id === workout?.id ? (
                                <LoggingWorkout activeWorkout={activeWorkout} />
                            ) : (
                                // Active workout is different
                                <div className="space-y-2">
                                    <p className="text-gray-500">
                                        You have an active workout: {activeWorkout.name}
                                    </p>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            resetWorkout();
                                        }}
                                    >
                                        Discard Active Workout
                                    </Button>
                                </div>
                            )
                        ) : (
                            workout ? (
                                workout.workout_exercises?.length ? (
                                    <div className="space-y-2">
                                        {workout.workout_exercises.map((ex) => (
                                            <div
                                                key={ex.id + Math.random}
                                                className="flex justify-between items-center p-2 bg-accent rounded-xl"
                                            >
                                                <p className="tracking-tight font-medium text-14">{ex.name}</p>
                                                <p className="text-sm text-gray-500">{ex.sets?.length || 0} sets</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No exercises added yet.</p>
                                )
                            ) : (
                                <p className="text-gray-500">This will start an empty workout.</p>
                            )
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleStart} className="bg-orange-600 text-white">
                            Start Workout
                        </Button>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default LogWorkoutModal;