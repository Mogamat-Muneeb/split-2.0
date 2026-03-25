import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import CreateWorkoutModal from "@/components/create-workout-modal";
import supabase from "@/lib/supabase";

interface Set {
  id: string;
  set_number: number;
  weight: number;
  reps?: number;
  rep_range_min?: number;
  rep_range_max?: number;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  name: string;
  notes: string;
  rest_timer: string;
  position: number;
  sets: Set[];
}

interface Workout {
  id: string;
  name: string;
  created_at: string;
  exercises: WorkoutExercise[];
}

const Splits = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    let subscription: any;

    const fetchWorkouts = async () => {
      try {
        // 1️⃣ fetch initial workouts for the current user
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
        setWorkouts(workoutsData || []);

        console.log("workoutsData", workoutsData);

        // 2️⃣ subscribe to real-time changes on workouts
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
              console.log("Realtime workout update:", payload);
              setWorkouts((prev) => {
                switch (payload.eventType) {
                  case "INSERT":
                    return [payload.new, ...prev];
                  case "UPDATE":
                    return prev.map((w) =>
                      w.id === payload.new.id ? payload.new : w,
                    );
                  case "DELETE":
                    return prev.filter((w) => w.id !== payload.old.id);
                  default:
                    return prev;
                }
              });
            },
          )
          .subscribe();
      } catch (err) {
        console.error("Failed to fetch workouts:", err);
      }
    };

    fetchWorkouts();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="w-full ">
      <div className="flex items-center justify-between w-full">
        <div className="font-bold text-lg">Splits</div>
      </div>

      <AnimatePresence>
        {isModalOpen && <CreateWorkoutModal closeModal={closeModal} />}
      </AnimatePresence>

      <div className="mt-4 flex items-center  w-full">
        <div className="w-full">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className="p-4 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-3xl mb-2"
            >
              <h3 className="font-bold text-orange-600">{workout.name}</h3>
              <p className="text-sm text-gray-500">
                {new Date(workout.created_at).toLocaleString()}
              </p>
              <ul className="mt-2 space-y-1">
                {/* {workout.workout_exercises.map((ex) => (
                <li key={ex.id} className="pl-2">
                  <span className="font-medium">{ex.name}</span> — {ex.sets.length} sets
                </li>
              ))} */}
              </ul>
            </div>
          ))}
        </div>
        <div className="w-full">
          <div>
            <Button onClick={openModal}>New Workout</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splits;
