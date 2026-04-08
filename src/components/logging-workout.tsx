/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ActiveWorkout } from "@/lib/types";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "framer-motion";
import { getFoldersAndContents } from "@/hooks/getExerciseByName";
import { CircleCheck, ArrowLeft } from "lucide-react";
import supabase from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface LoggingWorkoutProps {
  activeWorkout: ActiveWorkout | null;
}

interface Exercise {
  folder: string;
  images: string[];
  jsonContents: any[];
}

const LoggingWorkout: React.FC<LoggingWorkoutProps> = ({ activeWorkout }) => {
  const {
    updateSet,
    addExercise,
    addSet,

    setActiveWorkout,
    openStartWorkoutModal,
    setForceOpenWorkoutModal,
  } = useLogWorkout();
  const [user, setUser] = useState<any>(null);
  const [editingSet, setEditingSet] = useState<{
    exerciseId: string;
    setId: string;
    field: "weight" | "reps";
    value: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [workoutName, setWorkoutName] = useState(activeWorkout?.name || "");

  const [isNewWorkout, setIsNewWorkout] = useState(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const [exerciseRepTypes, setExerciseRepTypes] = useState<{
    [exerciseId: string]: "reps" | "repRange";
  }>({});

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching user:", error);
        return;
      }

      setUser(user);
    };

    getUser();
  }, []);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const { exercises } = await getFoldersAndContents();
        setExercises(exercises);
        setError(null);
      } catch (err) {
        setError("Failed to load exercises");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  useEffect(() => {
    if (activeWorkout?.exercises) {
      const repTypes: { [exerciseId: string]: "reps" | "repRange" } = {};
      activeWorkout.exercises.forEach((exercise) => {
        if (exercise.sets && exercise.sets.length > 0) {
          const firstSet = exercise.sets[0];

          const isRepRange =
            firstSet.rep_range_min !== null &&
            firstSet.rep_range_min !== undefined;
          repTypes[exercise.id] = isRepRange ? "repRange" : "reps";
        } else {
          repTypes[exercise.id] = "reps";
        }
      });
      setExerciseRepTypes(repTypes);
    }
  }, [activeWorkout?.exercises]);

  useEffect(() => {
    if (activeWorkout) {
      setWorkoutName(activeWorkout.name || "");

      setIsNewWorkout(!activeWorkout.workoutId);
    }
  }, [activeWorkout]);

  useEffect(() => {
    if (!activeWorkout?.id) return;

    const timeout = setTimeout(async () => {
      if (workoutName === activeWorkout.name) return;

      try {
        const { error } = await supabase
          .from("workout_sessions")
          .update({ name: workoutName })
          .eq("id", activeWorkout.id);

        if (error) {
          console.error("Error updating workout name:", error);
          toast.error("Failed to update workout name");
        }
      } catch (error) {
        console.error("Error updating workout name:", error);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [workoutName, activeWorkout?.id]);

  const handleWorkoutNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkoutName(e.target.value);
  };

  const checkMobile = () => {
    setIsMobileView(window.innerWidth < 768);
  };

  useEffect(() => {
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (editingSet && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingSet]);

  const formatRestTimer = (timer: string) => {
    const value = parseInt(timer);
    const unit = timer.replace(/[0-9]/g, "");

    if (unit === "s" || unit === "sec") {
      return `${value}s`;
    } else if (unit === "m" || unit === "min") {
      return `${value}m`;
    } else if (unit === "h" || unit === "hr") {
      return `${value}h`;
    }

    if (timer.includes(":")) {
      const [minutes, seconds] = timer.split(":");
      if (minutes === "0") {
        return `${seconds}s`;
      } else if (seconds === "00") {
        return `${minutes}m`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    }

    return timer;
  };

  const handleAddExercise = (exercise: Exercise) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    addExercise(exercise);
    setShowLibrary(false);
  };

  const startEditing = (
    exerciseId: string,
    setId: string,
    field: "weight" | "reps",
    currentValue: number | null,
  ) => {
    setEditingSet({
      exerciseId,
      setId,
      field,
      value: currentValue?.toString() || "",
    });
  };

  const saveEditing = (
    exerciseId: string,
    setId: string,
    field: "weight" | "reps",
  ) => {
    if (!editingSet) return;

    const newValue =
      editingSet.value === "" ? null : parseFloat(editingSet.value);

    if (field === "weight") {
      updateSet(exerciseId, setId, { weight: newValue || 0 });
    } else if (field === "reps") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      updateSet(exerciseId, setId, { reps: newValue || null });
    }

    setEditingSet(null);
  };

  const handleKeyPress = (
    e: React.KeyboardEvent,
    exerciseId: string,
    setId: string,
    field: "weight" | "reps",
  ) => {
    if (e.key === "Enter") {
      saveEditing(exerciseId, setId, field);
    } else if (e.key === "Escape") {
      setEditingSet(null);
    }
  };

  const handleBlur = () => {
    if (editingSet) {
      saveEditing(editingSet.exerciseId, editingSet.setId, editingSet.field);
    }
  };

  const handleAddSet = (exerciseId: string) => {
    const exercise = activeWorkout?.exercises?.find((e) => e.id === exerciseId);
    if (!exercise) return;

    const lastSet = exercise.sets[exercise.sets.length - 1];
    const currentRepType = exerciseRepTypes[exerciseId] || "reps";

    const newSet =
      currentRepType === "repRange"
        ? {
            set_number: exercise.sets.length + 1,
            weight: lastSet?.weight || 0,
            reps: null,
            rep_range_min: lastSet?.rep_range_min ?? 8,
            rep_range_max: lastSet?.rep_range_max ?? 12,
            checked: false,
          }
        : {
            set_number: exercise.sets.length + 1,
            weight: lastSet?.weight || 0,
            reps: lastSet?.reps ?? 0,
            rep_range_min: null,
            rep_range_max: null,
            checked: false,
          };

    addSet(exerciseId, newSet);
  };

  // const handleRemoveSet = (exerciseId: string, setId: string) => {
  //   if (confirm("Are you sure you want to remove this set?")) {
  //     removeSet(exerciseId, setId);
  //   }
  // };

  const handleRepTypeChange = (
    exerciseId: string,
    value: "reps" | "repRange",
  ) => {
    setExerciseRepTypes((prev) => ({ ...prev, [exerciseId]: value }));

    // Update all sets for this exercise
    const exercise = activeWorkout?.exercises?.find((e) => e.id === exerciseId);
    if (exercise && exercise.sets) {
      exercise.sets.forEach((set) => {
        if (value === "reps") {
          updateSet(exerciseId, set.id, {
            reps: set.reps || 0,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            rep_range_min: null,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            rep_range_max: null,
          });
        } else {
          updateSet(exerciseId, set.id, {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            reps: null,
            rep_range_min: set.rep_range_min || 8,
            rep_range_max: set.rep_range_max || 12,
          });
        }
      });
    }
  };

  const filteredExercises = exercises.filter((exercise) => {
    const searchLower = searchTerm.toLowerCase();
    const exerciseContent = exercise.jsonContents?.[0]?.content;

    if (!exerciseContent) return false;

    const searchableText = [
      exercise.folder,
      exerciseContent.name,
      exerciseContent.force,
      exerciseContent.level,
      exerciseContent.mechanic,
      exerciseContent.equipment,
      exerciseContent.category,
      ...(exerciseContent.primaryMuscles || []),
      ...(exerciseContent.secondaryMuscles || []),
    ];

    return searchableText.some((field) =>
      field?.toString().toLowerCase().includes(searchLower),
    );
  });

  const shouldShowWorkoutDetails = () => {
    if (!isMobileView) return true;
    return !showLibrary;
  };

  const shouldShowLibrary = () => {
    if (!isMobileView) return true;
    return showLibrary;
  };

  const handleSaveWorkout = async () => {
    if (!activeWorkout) return;

    try {
      // 1️⃣ Create the workout
      const { data: newWorkout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          name: workoutName || "My Workout",
          user_id: user.id,
        })
        .select()
        .single();

      if (workoutError || !newWorkout) throw workoutError;

      const workoutId = newWorkout.id;

      // 2️⃣ Prepare exercises payload
      const exercisesPayload = activeWorkout.exercises.map((ex, index) => {
        return {
          workout_id: workoutId,
          name: ex.name,
          notes: ex.notes,
          exercise_id: ex.name,
          rest_timer: ex.rest_timer,
          position: index,
          exercise_image: ex.exercise_image || null,
        };
      });

      // 3️⃣ Insert all exercises at once and get their IDs
      const { data: insertedExercises, error: exercisesError } = await supabase
        .from("workout_exercises")
        .insert(exercisesPayload)
        .select();

      if (exercisesError || !insertedExercises) throw exercisesError;

      // 4️⃣ Prepare sets payload using inserted exercise IDs
      const setsPayload = insertedExercises.flatMap((insertedEx, exIndex) => {
        const originalEx = activeWorkout.exercises[exIndex];
        if (!originalEx.sets || originalEx.sets.length === 0) return [];

        return originalEx.sets.map((set, setIndex) => ({
          workout_exercise_id: insertedEx.id,
          set_number: setIndex + 1,
          weight: Number(set.weight) || 0,
          reps: set.repType === "reps" ? Number(set.reps) || 0 : null,
          rep_range_min:
            set.repType === "repRange" ? Number(set.rep_range_min) || 0 : null,
          rep_range_max:
            set.repType === "repRange" ? Number(set.rep_range_max) || 0 : null,
        }));
      });

      // 5️⃣ Insert all sets at once
      if (setsPayload.length > 0) {
        const { error: setsError } = await supabase
          .from("sets")
          .insert(setsPayload);
        if (setsError) throw setsError;
      }

      // 6️⃣ Link session → workout
      await supabase
        .from("workout_sessions")
        .update({ workout_id: workoutId })
        .eq("id", activeWorkout.id);

      // 7️⃣ Update local state
      activeWorkout.workoutId = workoutId;

      const savedActiveWorkout: ActiveWorkout = {
        ...activeWorkout,
        workoutId: workoutId,
        exercises: insertedExercises.map((ex, exIndex) => ({
          ...activeWorkout.exercises[exIndex],
          id: ex.id,
          sets: setsPayload
            .filter((s) => s.workout_exercise_id === ex.id)
            .map((s) => ({
              ...activeWorkout.exercises[exIndex].sets[s.set_number - 1],
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-expect-error
              id: s.id,
              set_number: s.set_number,
            })),
        })),
      };

      // Update context/state
      openStartWorkoutModal(savedActiveWorkout);
      setForceOpenWorkoutModal(true);
      setActiveWorkout(savedActiveWorkout);
      setIsNewWorkout(false);

      toast.success("Workout saved 💪");
    } catch (err) {
      console.error("Failed to save workout:", err);
      toast.error("Failed to save workout");
    }
  };

  return (
    <div className="">
      <div className="bg-white dark:bg-[#2d2d2d] lg:rounded-3xl rounded-0 py-4 lg:h-full h-fit">
        <div className="flex flex-col md:flex-row gap-4">
          {shouldShowWorkoutDetails() && (
            <div className="flex-1 space-y-4 ">
              <div className="lg:max-h-98 max-h-[95vh] overflow-y-auto space-y-4  rounded-lg">
                <div>
                  <Input
                    placeholder="Workout name"
                    value={workoutName}
                    onChange={handleWorkoutNameChange}
                  />
                </div>
                {isNewWorkout && (
                  <Button className="w-full" onClick={handleSaveWorkout}>
                    Save Workout
                  </Button>
                )}
                {activeWorkout?.exercises?.map((exercise, i) => (
                  <div key={i} className="bg-accent rounded-lg p-4 w-full">
                    <div className="flex gap-2 items-center">
                      {exercise.exercise_image && (
                        <img
                          src={exercise.exercise_image}
                          alt={exercise.name}
                          className="w-10 h-10 rounded-full object-cover grayscale-100"
                        />
                      )}
                      <h3 className="font-medium my-4">{exercise.name}</h3>
                    </div>
                    <div className="flex flex-col gap-2 mb-10">
                      {exercise.notes && (
                        <p className="mt-2 text-sm">{exercise.notes}</p>
                      )}
                      {exercise.rest_timer && (
                        <p className="text-sm">
                          <span className="text-orange-600">Rest Timer: </span>
                          <span className="lowercase">
                            {formatRestTimer(exercise.rest_timer)}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="">
                      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] px-4 items-center w-full mb-4 gap-2 text-xs tracking-tight">
                        <div className="flex items-center justify-center w-full ">SET</div>
                        <div className="flex items-center justify-center w-full ">
                          PREV
                        </div>
                        <div className="flex items-center justify-center w-full">
                          KG
                        </div>
                        <div className="flex flex-col items-center justify-center w-full">
                          <Select
                            value={exerciseRepTypes[exercise.id] || "reps"}
                            onValueChange={(value: "reps" | "repRange") =>
                              handleRepTypeChange(exercise.id, value)
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className="border-0 w-auto p-1 !bg-transparent"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Rep type</SelectLabel>
                                <SelectItem value="reps">Reps</SelectItem>
                                <SelectItem value="repRange">
                                  Rep Range
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-center w-full">
                          DONE
                        </div>
                      </div>
                      {exercise?.sets?.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className={`grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 items-center text-sm p-4 group
                            ${
                              set.checked
                                ? "bg-orange-700/30 "
                                : setIndex % 2 === 1
                                  ? ""
                                  : "bg-background"
                            }
                          `}
                        >
                          <div className="w-full">
                            <Select
                              value={set.type || "Normal"}
                              onValueChange={(
                                value:
                                  | "Warm Up"
                                  | "Normal"
                                  | "Failure"
                                  | "Drop",
                              ) => {
                                updateSet(exercise.id, set.id, { type: value });
                              }}
                            >
                              <SelectTrigger
                                size="sm"
                                className="border-0 p-1 ring-0 bg-transparent! relative"
                              >
                                <div className="hidden">
                                  <SelectValue />
                                </div>
                                <div className="flex items-center">
                                  {set.type === "Warm Up" && (
                                    <div className="text-yellow-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                      W
                                    </div>
                                  )}
                                  {(!set.type || set.type === "Normal") && (
                                    <div className="font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                      {set.set_number}
                                    </div>
                                  )}
                                  {set.type === "Failure" && (
                                    <div className="text-red-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                      F
                                    </div>
                                  )}
                                  {set.type === "Drop" && (
                                    <div className="text-blue-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                      D
                                    </div>
                                  )}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Set Type</SelectLabel>
                                  <SelectItem value="Warm Up">
                                    <div className="flex items-center gap-2">
                                      <div className="text-yellow-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                        W
                                      </div>
                                      <p>Warm Up</p>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Normal">
                                    <div className="flex items-center gap-2">
                                      <div className="font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                        {set.set_number}
                                      </div>
                                      <p>Normal</p>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Failure">
                                    <div className="flex items-center gap-2">
                                      <div className="text-red-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                        F
                                      </div>
                                      <p>Failure</p>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Drop">
                                    <div className="flex items-center gap-2">
                                      <div className="text-blue-600! font-extrabold bg-accent h-7 w-7 flex justify-center items-center rounded">
                                        D
                                      </div>
                                      <p>Drop</p>
                                    </div>
                                  </SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center justify-center w-full">
                            -
                          </div>

                          <div className="flex items-center justify-center w-full">
                            {editingSet?.exerciseId === exercise.id &&
                            editingSet?.setId === set.id &&
                            editingSet?.field === "weight" ? (
                              <Input
                                ref={inputRef}
                                type="number"
                                value={editingSet.value}
                                onChange={(e) =>
                                  setEditingSet({
                                    ...editingSet,
                                    value: e.target.value,
                                  })
                                }
                                onKeyDown={(e) =>
                                  handleKeyPress(
                                    e,
                                    exercise.id,
                                    set.id,
                                    "weight",
                                  )
                                }
                                onBlur={handleBlur}
                              />
                            ) : (
                              <div
                                onClick={() =>
                                  startEditing(
                                    exercise.id,
                                    set.id,
                                    "weight",
                                    set.weight,
                                  )
                                }
                                className="flex items-center file:text-foreground placeholder:text-muted-foreground selection:bg-primary border-0 selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-xs"
                              >
                                <span>{set.weight}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center w-full">
                            {editingSet?.exerciseId === exercise.id &&
                            editingSet?.setId === set.id &&
                            editingSet?.field === "reps" ? (
                              <Input
                                ref={inputRef}
                                type="number"
                                value={editingSet.value}
                                onChange={(e) =>
                                  setEditingSet({
                                    ...editingSet,
                                    value: e.target.value,
                                  })
                                }
                                onKeyDown={(e) =>
                                  handleKeyPress(e, exercise.id, set.id, "reps")
                                }
                                onBlur={handleBlur}
                              />
                            ) : exerciseRepTypes[exercise.id] === "reps" ? (
                              <div
                                onClick={() => {
                                  startEditing(
                                    exercise.id,
                                    set.id,
                                    "reps",
                                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                    //@ts-ignore
                                    set.reps !== null ? set.reps : null,
                                  );
                                }}
                                className="flex items-center file:text-foreground placeholder:text-muted-foreground selection:bg-primary border-0 selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer  text-xs"
                              >
                                <span>
                                  {set.reps !== null ? `${set.reps}` : "0"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex gap-1 items-center">
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  value={set.rep_range_min ?? 8}
                                  onChange={(e) => {
                                    const newMin =
                                      parseInt(e.target.value) || 0;
                                    updateSet(exercise.id, set.id, {
                                      rep_range_min: newMin,
                                    });
                                  }}
                                  className="text-center p-0"
                                />
                                <span>-</span>
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  value={set.rep_range_max ?? 12}
                                  onChange={(e) => {
                                    const newMax =
                                      parseInt(e.target.value) || 0;
                                    updateSet(exercise.id, set.id, {
                                      rep_range_max: newMax,
                                    });
                                  }}
                                  className="text-center p-0"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-center w-full">
                            <input
                              className="accent-orange-700"
                              type="checkbox"
                              checked={set.checked || false}
                              onChange={() =>
                                updateSet(exercise.id, set.id, {
                                  checked: !set.checked,
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        onClick={() => handleAddSet(exercise.id)}
                        className="w-full mt-3"
                      >
                        Add set
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {shouldShowWorkoutDetails() && (
                <div className={` w-full flex lg:hidden`}>
                  <Button
                    className="w-full"
                    onClick={() => setShowLibrary(true)}
                  >
                    Add Exercise
                  </Button>
                </div>
              )}
            </div>
          )}

          {shouldShowLibrary() && (
            <div className="flex-1">
              <div className="space-y-2">
                <div className="flex flex-col items-start">
                  <div className="flex gap-2 items-center pb-4">
                    {isMobileView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLibrary(false)}
                        className="shrink-0"
                      >
                        <ArrowLeft size={20} />
                      </Button>
                    )}
                    <h2 className="text-base tracking-tight font-bold">
                      Exercise Library
                    </h2>
                  </div>
                  <Input
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="bg-accent rounded-lg p-4 lg:max-h-90 max-h-[95vh] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">
                          Loading exercises...
                        </p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-red-500">Error: {error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
                      >
                        Try again
                      </button>
                    </div>
                  ) : filteredExercises.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No exercises found
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredExercises.map((exercise, i) => {
                        const exerciseData =
                          exercise.jsonContents?.[0]?.content;
                        const primaryMuscles =
                          exerciseData?.primaryMuscles?.join(", ") || "N/A";

                        const isAlreadyAdded = activeWorkout?.exercises?.some(
                          (e) => e.exercise_id === exercise.folder,
                        );
                        return (
                          <motion.div
                            key={i}
                            whileHover={{ scale: 1.02 }}
                            className={`flex items-center justify-start py-1 overflow-hidden w-full ${
                              !isAlreadyAdded
                                ? "cursor-pointer"
                                : "cursor-not-allowed opacity-60"
                            }`}
                            onClick={() =>
                              !isAlreadyAdded && handleAddExercise(exercise)
                            }
                          >
                            <div className="flex items-center justify-center w-full">
                              <div className="flex-shrink-0">
                                {exercise.images[0] && (
                                  <img
                                    src={exercise.images[0]}
                                    alt={exercise.folder}
                                    className="w-10 h-10 rounded-full object-cover grayscale-100"
                                  />
                                )}
                              </div>
                              <div className="flex items-center justify-between w-full ml-3">
                                <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-[14px] font-medium">
                                      {exerciseData?.name ||
                                        exercise.folder.replace(/_/g, " ")}
                                    </h4>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    <span className="text-orange-600 font-medium text-[10px] rounded capitalize">
                                      {primaryMuscles}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  {isAlreadyAdded && (
                                    <CircleCheck
                                      size={20}
                                      className="fill-orange-600 stroke-white [&>circle]:stroke-none"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoggingWorkout;
