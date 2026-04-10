/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";

import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import CreatePlan from "@/components/create-plan";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Dumbbell,
  ChevronRight,
  Trash2,
  Edit,
} from "lucide-react";
import type { Split } from "@/lib/utils";

const Splits = () => {
  const [splits, setSplits] = useState<Split[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSplit(null);
  };

  const openModal = () => {
    setEditingSplit(null);
    setIsModalOpen(true);
  };

  const editSplit = (split: Split) => {
    setEditingSplit(split);
    setIsModalOpen(true);
  };

  const deleteSplit = async (splitId: string, splitName: string) => {
    if (!confirm(`Are you sure you want to delete "${splitName}"?`)) return;

    try {
      const { error } = await supabase
        .from("splits")
        .delete()
        .eq("id", splitId);

      if (error) throw error;

      setSplits((prev) => prev.filter((s) => s.id !== splitId));
    } catch (err) {
      console.error("Failed to delete split:", err);
      alert("Failed to delete split. Please try again.");
    }
  };

  useEffect(() => {
    let subscription: any;

    const fetchSplits = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch splits with their days, exercises, and sets
        const { data: splitsData, error } = await supabase
          .from("splits")
          .select(
            `
            id,
            name,
            difficulty,
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
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform the data to match our interface
        const transformedSplits = (splitsData || []).map((split: any) => ({
          id: split.id,
          name: split.name,
          difficulty: split.difficulty,
          created_at: split.created_at,
          updated_at: split.updated_at,
          days: (split.split_days || [])
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
        }));

        setSplits(transformedSplits);

        // Subscribe to real-time changes
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
              // Refetch all data when any split changes
              fetchSplits();
            },
          )
          .subscribe();
      } catch (err) {
        console.error("Failed to fetch splits:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSplits();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "text-green-600 bg-green-100";
      case "Intermediate":
        return "text-blue-600 bg-blue-100";
      case "Advanced":
        return "text-orange-600 bg-orange-100";
      case "Expert":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTotalExercises = (split: Split) => {
    return split.days.reduce((total, day) => total + day.exercises.length, 0);
  };

  const getTotalSets = (split: Split) => {
    return split.days.reduce(
      (total, day) =>
        total + day.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
      0,
    );
  };

  return (
    <>
      <AnimatePresence>
        {isModalOpen && (
          <CreatePlan
            closeModal={closeModal}
            existingSplitId={editingSplit?.id}
            existingSplitData={editingSplit}
          />
        )}
      </AnimatePresence>

      <div className="max-w-[1440px] mx-auto pt-10 px-4 pb-10">
        <div className="flex items-center justify-between w-full mb-8">
          <div>
            <h2 className="text-orange-600 font-black lg:text-2xl text-lg tracking-tight">
              Workout Splits
            </h2>
            <p className="lg:text-sm text-xs text-muted-foreground">
              Create and manage your workout splits/programs.
            </p>
          </div>
          {splits.length > 0 && (
            <div>
              <Button
                onClick={openModal}
                className="hover:bg-orange-700 bg-orange-600 text-white"
              >
                Create Split
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 lg:text-sm text-xs">
            Loading workouts..
          </p>
        ) : splits.length === 0 ? (
          <div className="text-center py-20 bg-accent rounded-2xl">
            <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No splits yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first workout split to get started
            </p>
            <Button
              onClick={openModal}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Create Your First Split
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {splits.map((split) => (
              <motion.div
                key={split.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{split.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(split.difficulty)}`}
                        >
                          {split.difficulty}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-accent text-muted-foreground">
                          {split.days.length}{" "}
                          {split.days.length === 1 ? "Day" : "Days"}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-accent text-muted-foreground">
                          {getTotalExercises(split)} exercises
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-accent text-muted-foreground">
                          {getTotalSets(split)} sets
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => editSplit(split)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSplit(split.id, split.name)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(split.created_at)}</span>
                    </div>

                    {split.days.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {split.days.slice(0, 3).map((day) => (
                          <span
                            key={day.id}
                            className="text-xs px-2 py-1 rounded-md bg-accent"
                          >
                            {day.weekday || `Day ${day.day_number}`}
                          </span>
                        ))}
                        {split.days.length > 3 && (
                          <span className="text-xs px-2 py-1 rounded-md bg-accent">
                            +{split.days.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <Link to={`/splits/${split.id}`}>
                    <Button variant="outline" className="w-full group">
                      View Split Details
                      <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Splits;
