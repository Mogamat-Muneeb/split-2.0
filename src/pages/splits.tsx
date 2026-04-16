/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import CreatePlan from "@/components/create-plan";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dumbbell,
  Trash2,
  EllipsisVertical,
  Pen,
  AlertTriangle,
  SquareCheck,
} from "lucide-react";
import type { Split } from "@/lib/utils";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Splits = () => {
  const [splits, setSplits] = useState<Split[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(true);
  const [splitToDelete, setSplitToDelete] = useState<Split | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteClick = (split: Split, e: React.MouseEvent) => {
    e.stopPropagation();
    setSplitToDelete(split);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!splitToDelete) return;

    try {
      setIsDeleting(true);

      // First, delete all split_day_exercises sets
      // Get all split_days for this split
      const { data: splitDays, error: splitDaysError } = await supabase
        .from("split_days")
        .select("id")
        .eq("split_id", splitToDelete.id);

      if (splitDaysError) throw splitDaysError;

      if (splitDays && splitDays.length > 0) {
        const splitDayIds = splitDays.map((day) => day.id);

        // Get all split_day_exercises for these split_days
        const { data: splitDayExercises, error: exercisesError } =
          await supabase
            .from("split_day_exercises")
            .select("id")
            .in("split_day_id", splitDayIds);

        if (exercisesError) throw exercisesError;

        if (splitDayExercises && splitDayExercises.length > 0) {
          const exerciseIds = splitDayExercises.map((ex) => ex.id);

          // Delete all sets
          const { error: setsError } = await supabase
            .from("split_exercise_sets")
            .delete()
            .in("split_day_exercise_id", exerciseIds);

          if (setsError) throw setsError;
        }

        // Delete all split_day_exercises
        const { error: deleteExercisesError } = await supabase
          .from("split_day_exercises")
          .delete()
          .in("split_day_id", splitDayIds);

        if (deleteExercisesError) throw deleteExercisesError;
      }

      // Delete all split_days
      const { error: deleteDaysError } = await supabase
        .from("split_days")
        .delete()
        .eq("split_id", splitToDelete.id);

      if (deleteDaysError) throw deleteDaysError;

      // Finally delete the split
      const { error: deleteSplitError } = await supabase
        .from("splits")
        .delete()
        .eq("id", splitToDelete.id);

      if (deleteSplitError) throw deleteSplitError;

      // Update local state
      setSplits((prev) => prev.filter((s) => s.id !== splitToDelete.id));

      toast.success(`${splitToDelete.name} has been deleted`);

      setIsConfirmModalOpen(false);
      setSplitToDelete(null);
    } catch (err) {
      console.error("Failed to delete split:", err);
      toast.error("Failed to delete split. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmModalOpen(false);
    setSplitToDelete(null);
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
            is_active,
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
          is_active: split.is_active,
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

  // Add this function to your Splits component
  const setActiveSplit = async (splitId: string, splitName: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Set the selected split to active
      const { error: updateError } = await supabase
        .from("splits")
        .update({ is_active: true })
        .eq("id", splitId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Deactivate all other splits
      const { error: deactivateError } = await supabase
        .from("splits")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .neq("id", splitId);

      if (deactivateError) throw deactivateError;

      // Update local state
      setSplits((prev) =>
        prev.map((split) => ({
          ...split,
          is_active: split.id === splitId,
        })),
      );

      toast.success(`${splitName} is now active`);
    } catch (err) {
      console.error("Failed to set active split:", err);
      toast.error("Failed to set active split");
    }
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

      {/* Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#2d2d2d] rounded-3xl border-0 shadow-xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-sm text-start">
              Are you sure you want to delete the split "{splitToDelete?.name}"?
              This action cannot be undone and will permanently delete:
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>All days in this split</li>
              <li>All exercises in each day</li>
              <li>All sets for each exercise</li>
            </ul>
          </div>

          <DialogFooter className="flex gap-2">
            <Button onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Split"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-[1440px] mx-auto pt-10  pb-10">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...splits]
              .sort((a, b) => {
                if (a.is_active && !b.is_active) return -1;
                if (!a.is_active && b.is_active) return 1;
                return (
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
                );
              })
              .map((split) => {
                return (
                  <motion.div
                    key={split.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-accent rounded-2xl overflow-hidden hover:shadow-lg transition-shadow relative"
                  >
                    {split.is_active && (
                      <div className="flex justify-end">
                        <div className="bg-[#3D348B] text-white text-xs absolute top-0 rounded-tr-2xl rounded-bl-2xl w-fit px-4 py-1">
                          Active
                        </div>
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items- w-full justify-start flex-col gap-2">
                          <h3 className="lg:flex hidden font-bold tracking-tight truncate uppercase">
                            {split.name}
                          </h3>
                          <h3 className="flex lg:hidden font-bold lg:text-base text-sm tracking-tight truncate">
                            {split.name.length > 15
                              ? `${split.name.slice(0, 15)}...`
                              : split.name}
                          </h3>
                          <div className="flex flex-wrap lg:text-sm text-xs text-muted-foreground uppercase">
                            <span className={`  `}>{split.difficulty}</span>
                            <span className=" ">・</span>
                            <span className=" ">
                              {split.days.length}{" "}
                              {split.days.length === 1 ? "Day" : "Days"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <EllipsisVertical
                                size={18}
                                className="cursor-pointer rotate-90"
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-40" align="start">
                              <DropdownMenuGroup>
                                {!split.is_active && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setActiveSplit(split.id, split.name)
                                    }
                                  >
                                    <div className="flex items-center gap-3">
                                      <SquareCheck className="h-4 w-4" />
                                      <p className="text-sm"> Set Active</p>
                                    </div>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => editSplit(split)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Pen className="h-4 w-4" />
                                    <p className="text-sm">Edit</p>
                                  </div>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(e) => handleDeleteClick(split, e)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Trash2 className="h-4 w-4" />
                                    <p className="text-sm">Delete</p>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>
    </>
  );
};

export default Splits;
