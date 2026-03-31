/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";

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
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    let subscription: any;

    const fetchWorkouts = async () => {
      try {
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        setWorkouts(workoutsData || []);

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
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-expect-error
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

      <div className="mt-4 flex items-center  w-full"></div>
    </div>
  );
};

export default Splits;
