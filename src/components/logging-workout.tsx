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
  resetWorkout: () => void;
  onClose: () => void;
}

interface Exercise {
  folder: string;
  images: string[];
  jsonContents: any[];
}

const LoggingWorkout: React.FC<LoggingWorkoutProps> = ({
  activeWorkout,
  resetWorkout,
  onClose,
}) => {
  const { updateSet, addExercise, addSet, removeSet, updateExercise } = useLogWorkout();
  const [editingSet, setEditingSet] = useState<{
    exerciseId: string;
    setId: string;
    field: "weight" | "reps";
    value: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [restDuration, setRestDuration] = useState(0);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const [exerciseRepTypes, setExerciseRepTypes] = useState<{
    [exerciseId: string]: "reps" | "repRange";
  }>({});

  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const restIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingSetCheck, setPendingSetCheck] = useState<{
    exerciseId: string;
    setId: string;
    restTimer: string | number | null | undefined;
  } | null>(null);

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

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
      }
    };
  }, []);

  const parseRestTimerToSeconds = (
    timer: string | number | null | undefined,
  ): number => {
    if (!timer || timer === "off") return 0;

    const timerStr = String(timer);

    if (timerStr.includes(":")) {
      const [min, sec] = timerStr.split(":").map(Number);
      return min * 60 + sec;
    }

    const value = parseInt(timerStr);
    if (timerStr.includes("h")) return value * 3600;
    if (timerStr.includes("m")) return value * 60;
    if (timerStr.includes("s")) return value;

    return value;
  };

  const startRestTimer = (seconds: number) => {
    // Clear any existing timer
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }

    setIsResting(true);
    setRestTimeLeft(seconds);
    setRestDuration(seconds);

    restIntervalRef.current = setInterval(() => {
      setRestTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer finished
          if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
          }
          setIsResting(false);
          
          // Process any pending set check that was waiting for timer to finish
          if (pendingSetCheck) {
            updateSet(pendingSetCheck.exerciseId, pendingSetCheck.setId, { 
              checked: true 
            });
            setPendingSetCheck(null);
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSetCheck = (
    exerciseId: string,
    setId: string,
    currentlyChecked: boolean,
    restTimer: string | number | null | undefined,
  ) => {
    const newCheckedState = !currentlyChecked;
    
    // If we're unchecking a set, just update it directly
    if (!newCheckedState) {
      updateSet(exerciseId, setId, { checked: false });
      return;
    }

    // If we're checking a set and there's a rest timer
    if (newCheckedState && restTimer && restTimer !== "off") {
      const seconds = parseRestTimerToSeconds(restTimer);
      
      // If timer is already running, store this set check to process when timer finishes
      if (isResting) {
        setPendingSetCheck({ exerciseId, setId, restTimer });
        // Optionally show a toast or notification that the set will be marked after timer
        console.log("Timer active, set will be marked when timer completes");
      } else {
        // No timer running, start new timer and mark set as checked
        startRestTimer(seconds);
        updateSet(exerciseId, setId, { checked: true });
      }
    } else {
      // No rest timer, just mark as checked
      updateSet(exerciseId, setId, { checked: true });
    }
  };

  const handleAdjustTime = (seconds: number) => {
    if (!isResting) return;
    
    const newTime = Math.max(0, restTimeLeft + seconds);
    setRestTimeLeft(newTime);
    
    // If we're going below 0, finish the timer
    if (newTime <= 0) {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }
      setIsResting(false);
      
      // Process pending set check
      if (pendingSetCheck) {
        updateSet(pendingSetCheck.exerciseId, pendingSetCheck.setId, { 
          checked: true 
        });
        setPendingSetCheck(null);
      }
    }
  };

  const handleSkipTimer = () => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    setIsResting(false);
    
    // Process pending set check
    if (pendingSetCheck) {
      updateSet(pendingSetCheck.exerciseId, pendingSetCheck.setId, { 
        checked: true 
      });
      setPendingSetCheck(null);
    }
  };

  const progress = restDuration
    ? ((restDuration - restTimeLeft) / restDuration) * 100
    : 0;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = seconds % 60;

    const paddedHrs = String(hrs).padStart(2, "0");
    const paddedMin = String(min).padStart(2, "0");
    const paddedSec = String(sec).padStart(2, "0");

    return hrs > 0
      ? `${paddedHrs}:${paddedMin}:${paddedSec}`
      : `${paddedMin}:${paddedSec}`;
  };
  
  const formatRestTimer = (timer: string | number | null | undefined) => {
    if (!timer || timer === "off") return "Off";

    const timerStr = String(timer);
    const value = parseInt(timerStr);
    const unit = timerStr.replace(/[0-9]/g, "");

    if (unit === "s" || unit === "sec") return `${value}s`;
    if (unit === "m" || unit === "min") return `${value}m`;
    if (unit === "h" || unit === "hr") return `${value}h`;

    if (timerStr.includes(":")) {
      const [minutes, seconds] = timerStr.split(":");
      if (minutes === "0") return `${seconds}s`;
      if (seconds === "00") return `${minutes}m`;
      return `${minutes}m ${seconds}s`;
    }

    return timerStr;
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

  const handleRestTimerChange = (exerciseId: string, value: string) => {
    // Update the exercise's rest timer
    updateExercise(exerciseId, { rest_timer: value });
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

  const getExerciseCategory = (exerciseName: string) => {
    const match = exercises.find(
      (ex) =>
        ex.jsonContents?.[0]?.content?.name?.toLowerCase().trim() ===
        exerciseName.toLowerCase().trim(),
    );

    return match?.jsonContents?.[0]?.content?.category?.toLowerCase() || "";
  };

  const WEIGHT_CATEGORIES = [
    "strength",
    "powerlifting",
    "olympic weightlifting",
    "strongman",
  ];

  const shouldShowWeight = (category: string) =>
    WEIGHT_CATEGORIES.includes(category);

  return (
    <div className="">
      <div className="bg-white dark:bg-[#2d2d2d] lg:rounded-3xl rounded-0 py-4 lg:h-full h-fit">
        <div className="flex flex-col md:flex-row gap-4 ">
          {shouldShowWorkoutDetails() && (
            <div className="flex-1 space-y-4 ">
              <div className="lg:max-h-110 max-h-[95vh] overflow-y-auto space-y-4 rounded-lg ">
                {activeWorkout?.exercises?.map((exercise) => {
                  const category = getExerciseCategory(exercise.name);
                  const showWeight = shouldShowWeight(category);
                  return (
                    <div
                      key={exercise.id}
                      className="bg-accent rounded-lg p-4 w-full"
                    >
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
                      
                      <div className="flex flex-col gap-2 mb-4">
                        {exercise.notes && (
                          <p className="text-sm">{exercise.notes}</p>
                        )}
                        
                        {/* Rest Timer Selector */}
                        <div className="w-full">
                          <h2 className="text-sm font-medium mb-2">Rest Timer</h2>
                          <Select
                            value={exercise.rest_timer?.toString() || "off"}
                            onValueChange={(value) =>
                              handleRestTimerChange(exercise.id, value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a timer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Rest Timer</SelectLabel>
                                <SelectItem value="off">Off</SelectItem>
                                <SelectItem value="30">00:30</SelectItem>
                                <SelectItem value="60">01:00</SelectItem>
                                <SelectItem value="90">01:30</SelectItem>
                                <SelectItem value="120">02:00</SelectItem>
                                <SelectItem value="150">02:30</SelectItem>
                                <SelectItem value="300">05:00</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="">
                        <div
                          className={`grid ${
                            showWeight
                              ? "grid-cols-[auto_1fr_1fr_1fr_1fr]"
                              : "grid-cols-[auto_1fr_1fr_1fr]"
                          } px-2 items-center w-full mb-4 gap-2 text-xs tracking-tight`}
                        >
                          <div className="w-fit">SET</div>
                          <div className="flex items-center justify-center w-full">
                            PREV
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
                            key={set.id}
                            className={`grid ${
                              showWeight
                                ? "grid-cols-[auto_1fr_1fr_1fr_1fr]"
                                : "grid-cols-[auto_1fr_1fr_1fr]"
                            } gap-2 items-center text-sm p-4 group
                              ${
                                set.checked
                                  ? "bg-orange-700/30 "
                                  : setIndex % 2 === 1
                                    ? ""
                                    : "bg-background"
                              }
                            `}
                          >
                            <div className=" w-fit">{set.set_number}</div>
                            <div className="flex items-center justify-center w-full">
                              -
                            </div>
                            {/* Editable Weight */}
                            {showWeight && (
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
                            )}

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
                                    handleKeyPress(
                                      e,
                                      exercise.id,
                                      set.id,
                                      "reps",
                                    )
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
                                  handleSetCheck(
                                    exercise.id,
                                    set.id,
                                    set.checked || false,
                                    exercise.rest_timer,
                                  )
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
                  );
                })}
              </div>

              {shouldShowWorkoutDetails() && (
                <>
                  {activeWorkout?.exercises.length < 1 && (
                    <div className="lg:flex hidden w-full">
                      <div className="bg-accent rounded-xl px-3 py-4 w-full">
                        <p className="font-bold text-base tracking-tight">
                          No exercises added yet
                        </p>
                        <p className="text-sm">
                          Click on exercises from the right panel to add them
                        </p>
                      </div>
                    </div>
                  )}
                </>
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

        <div className=" w-full flex gap-2 items-center left-0 right-0 py-3 ">
          <div className="lg:hidden flex w-full ">
            <Button className="w-full" onClick={() => setShowLibrary(true)}>
              Add Exercise
            </Button>
          </div>
          <div className="w-full  ">
            <Button
              className="bg-red-700 text-white w-full"
              onClick={() => {
                resetWorkout();
                onClose();
              }}
            >
              Discard Workout
            </Button>
          </div>
        </div>
      </div>

      {/* Rest Timer Overlay */}
      {isResting && (
        <div className="fixed flex w-full bg-background bottom-0 left-0 rounded-t-lg px-2 py-4 gap-2 items-center shadow-lg border-t border-orange-600/20">
          {/* Top border progress */}
          <div className="absolute top-0 left-0 w-full h-1 rounded-t-lg overflow-hidden">
            <div
              className="h-full bg-orange-600 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="w-full">
            <Button 
              className="border-orange-600/30 hover:bg-orange-600/10" 
              variant="outline"
              onClick={() => handleAdjustTime(-15)}
              disabled={restTimeLeft <= 0}
            >
              -15
            </Button>
          </div>

          <div className="w-full text-center">
            <p className="text-white font-mono text-xl font-semibold">
              {formatTime(restTimeLeft)}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full">
            <Button 
              className="border-orange-600/30 hover:bg-orange-600/10" 
              variant="outline"
              onClick={() => handleAdjustTime(15)}
            >
              +15
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleSkipTimer}
            >
              Skip
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoggingWorkout;