/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";

import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import CreatePlan from "@/components/create-plan";
import { AnimatePresence } from "framer-motion";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

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
    <>
      <AnimatePresence>
        {isModalOpen && <CreatePlan closeModal={closeModal} />}
      </AnimatePresence>

      <div className="max-w-[1440px] mx-auto pt-10 space-y-10">
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-orange-600 font-black lg:text-2xl text-lg tracking-tight">
              Splits
            </h2>
            <p className="lg:text-sm text-xs">Create your own splits.</p>
          </div>
          <div>
            <Button
              onClick={openModal}
              className="hover:bg-orange-700 bg-orange-600 text-foreground"
            >
              Create Split
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center  w-full"></div>
      </div>
    </>
  );
};

export default Splits;
