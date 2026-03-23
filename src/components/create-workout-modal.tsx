import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "./ui/input";
import { getFoldersAndContents } from "@/hooks/getExerciseByName";
import {
  CircleCheck,
  EllipsisVertical,
  Trash2,
  Plus,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExerciseJsonContent {
  [key: string]: any;
}

interface Exercise {
  folder: string;
  images: string[];
  jsonContents: ExerciseJsonContent[];
}

interface Set {
  weight: number;
  repType: "reps" | "repRange";
  reps?: number;
  repRangeMin?: number;
  repRangeMax?: number;
}

interface WorkoutExercise {
  exercise: Exercise;
  notes: string;
  restTimer: string;
  sets: Set[];
}

interface CreateWorkoutModalProps {
  closeModal: () => void;
}

const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({
  closeModal,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(
    [],
  );

  // Form state for adding a new set to a specific exercise
  const [newSetForm, setNewSetForm] = useState<{
    [folder: string]: {
      weight: string;
      repType: "reps" | "repRange";
      reps: string;
      repRangeMin: string;
      repRangeMax: string;
    };
  }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { exercises } = await getFoldersAndContents();
        setExercises(exercises);
        setError(null);
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const initializeSetForm = (folder: string) => {
    if (!newSetForm[folder]) {
      setNewSetForm((prev) => ({
        ...prev,
        [folder]: {
          weight: "",
          repType: "reps",
          reps: "",
          repRangeMin: "",
          repRangeMax: "",
        },
      }));
    }
  };

  const addExercise = (exercise: Exercise) => {
    if (!selectedExercises.find((e) => e.folder === exercise.folder)) {
      setSelectedExercises([...selectedExercises, exercise]);
      setWorkoutExercises([
        ...workoutExercises,
        {
          exercise: exercise,
          notes: "",
          restTimer: "off",
          sets: [],
        },
      ]);
      initializeSetForm(exercise.folder);
    }
  };

  const removeExercise = (exerciseToRemove: Exercise) => {
    setSelectedExercises(
      selectedExercises.filter(
        (exercise) => exercise.folder !== exerciseToRemove.folder,
      ),
    );
    setWorkoutExercises(
      workoutExercises.filter(
        (we) => we.exercise.folder !== exerciseToRemove.folder,
      ),
    );
    // Clean up form state
    const newFormState = { ...newSetForm };
    delete newFormState[exerciseToRemove.folder];
    setNewSetForm(newFormState);
  };

  const updateWorkoutExercise = (
    folder: string,
    updates: Partial<WorkoutExercise>,
  ) => {
    setWorkoutExercises(
      workoutExercises.map((we) =>
        we.exercise.folder === folder ? { ...we, ...updates } : we,
      ),
    );
  };

  const updateSet = (
    folder: string,
    setIndex: number,
    updates: Partial<Set>,
  ) => {
    setWorkoutExercises(
      workoutExercises.map((we) =>
        we.exercise.folder === folder
          ? {
              ...we,
              sets: we.sets.map((set, index) =>
                index === setIndex ? { ...set, ...updates } : set,
              ),
            }
          : we,
      ),
    );
  };

  const addSet = (folder: string) => {
    const formData = newSetForm[folder];
    if (!formData) return;

    const newSet: Set = {
      weight: parseFloat(formData.weight) || 0,
      repType: formData.repType,
    };

    if (formData.repType === "reps") {
      newSet.reps = parseInt(formData.reps) || 0;
    } else {
      newSet.repRangeMin = parseInt(formData.repRangeMin) || 0;
      newSet.repRangeMax = parseInt(formData.repRangeMax) || 0;
    }

    setWorkoutExercises(
      workoutExercises.map((we) =>
        we.exercise.folder === folder
          ? { ...we, sets: [...we.sets, newSet] }
          : we,
      ),
    );

    // Reset the form
    setNewSetForm((prev) => ({
      ...prev,
      [folder]: {
        weight: "",
        repType: "reps",
        reps: "",
        repRangeMin: "",
        repRangeMax: "",
      },
    }));
  };

  const removeSet = (folder: string, setIndex: number) => {
    setWorkoutExercises(
      workoutExercises.map((we) =>
        we.exercise.folder === folder
          ? { ...we, sets: we.sets.filter((_, index) => index !== setIndex) }
          : we,
      ),
    );
  };

  const updateSetForm = (folder: string, field: string, value: any) => {
    setNewSetForm((prev) => ({
      ...prev,
      [folder]: {
        ...prev[folder],
        [field]: value,
      },
    }));
  };

  const handleSaveWorkout = () => {
    const workoutData = {
      name: workoutName,
      createdAt: new Date().toISOString(),
      exercises: workoutExercises.map((we) => ({
        id: we.exercise.folder,
        name:
          we.exercise.jsonContents?.[0]?.content?.name ||
          we.exercise.folder.replace(/_/g, " "),
        notes: we.notes,
        restTimer: we.restTimer,
        sets: we.sets.map((set, index) => ({
          setNumber: index + 1,
          weight: set.weight,
          ...(set.repType === "reps"
            ? { reps: set.reps }
            : { repRange: { min: set.repRangeMin, max: set.repRangeMax } }),
        })),
      })),
      totalExercises: selectedExercises.length,
      totalSets: workoutExercises.reduce(
        (total, we) => total + we.sets.length,
        0,
      ),
    };

    console.log("Saving workout:", workoutData);
  };

  const filteredExercises = exercises.filter((exercise) =>
    exercise.folder.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
        className="fixed inset-0 bg-black/20 z-40"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-6xl  "
      >
        <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-xl p-6 m-4  ">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column - Workout Details */}
            <div className="flex-1  h-full">
              <div className="flex justify-between items-center">
                <h2 className="text-lg tracking-tight font-bold">
                  New Workout
                </h2>
              </div>

              <Input
                placeholder="Workout name"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />

              <div className="rounded-lg overflow-y-auto mt-2  h-[50vh] max-h-[90vh] ">
                {selectedExercises.length === 0 ? (
                  <div className="bg-accent rounded-xl px-3 py-4">
                    <p className="font-bold">No exercises added yet</p>
                    <p className="text-sm">
                      Click on exercises from the right panel to add them
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-lg">
                    {selectedExercises.map((exercise) => {
                      const workoutExercise = workoutExercises.find(
                        (we) => we.exercise.folder === exercise.folder,
                      );
                      const setForm = newSetForm[exercise.folder];

                      return (
                        <div
                          key={exercise.folder}
                          className="flex flex-col gap-4 bg-accent rounded-xl px-3 py-4"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center w-full gap-2">
                              <div>
                                <GripVertical size={18} />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0">
                                  {exercise.images[0] && (
                                    <img
                                      src={exercise.images[0]}
                                      alt={exercise.folder}
                                      className="w-10 h-10 rounded-full object-cover grayscale-100"
                                    />
                                  )}
                                </div>
                                <span className="font-medium">
                                  {exercise.folder.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <EllipsisVertical
                                  size={18}
                                  className="cursor-pointer"
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                className="w-40"
                                align="start"
                              >
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => removeExercise(exercise)}
                                  >
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Notes */}
                          <div className="w-full">
                            <h2 className="text-sm font-medium mb-2">Notes</h2>
                            <Input
                              placeholder="Any notes"
                              value={workoutExercise?.notes || ""}
                              onChange={(e) =>
                                updateWorkoutExercise(exercise.folder, {
                                  notes: e.target.value,
                                })
                              }
                            />
                          </div>

                          {/* Rest Timer */}
                          <div className="w-full">
                            <h2 className="text-sm font-medium mb-2">
                              Rest Timer
                            </h2>
                            <Select
                              value={workoutExercise?.restTimer || "off"}
                              onValueChange={(value) =>
                                updateWorkoutExercise(exercise.folder, {
                                  restTimer: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-full max-w-48">
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

                          {/* Display existing sets - now editable */}
                          {workoutExercise?.sets &&
                            workoutExercise.sets.length > 0 && (
                              <div className="w-full">
                                <div className="space-y-3">
                                  {workoutExercise.sets.map((set, setIndex) => (
                                    <div
                                      key={setIndex}
                                      className="flex flex-col gap-2 p-3 bg-background rounded-lg"
                                    >
                                      <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium">
                                          Set {setIndex + 1}
                                        </h3>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            removeSet(exercise.folder, setIndex)
                                          }
                                          className="p-0"
                                        >
                                          <Trash2 size={16} />
                                        </Button>
                                      </div>
                                      <div className="w-full flex justify-between items-center gap-2">
                                        <div className="w-fit flex flex-col">
                                          <h2 className="text-sm">Set</h2>
                                          <Input
                                            className="w-12"
                                            type="number"
                                            disabled
                                            value={setIndex + 1}
                                          />
                                        </div>
                                        <div className="w-fit">
                                          <h2 className="text-sm">kgs</h2>
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            value={set.weight || ""}
                                            onChange={(e) =>
                                              updateSet(
                                                exercise.folder,
                                                setIndex,
                                                {
                                                  weight:
                                                    parseFloat(
                                                      e.target.value,
                                                    ) || 0,
                                                },
                                              )
                                            }
                                            className="w-24"
                                          />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-1">
                                            <h2 className="text-sm">Reps</h2>
                                            <Select
                                              value={set.repType}
                                              onValueChange={(
                                                value: "reps" | "repRange",
                                              ) => {
                                                if (value === "reps") {
                                                  updateSet(
                                                    exercise.folder,
                                                    setIndex,
                                                    {
                                                      repType: "reps",
                                                      reps: set.reps || 0,
                                                      repRangeMin: undefined,
                                                      repRangeMax: undefined,
                                                    },
                                                  );
                                                } else {
                                                  updateSet(
                                                    exercise.folder,
                                                    setIndex,
                                                    {
                                                      repType: "repRange",
                                                      repRangeMin:
                                                        set.repRangeMin || 0,
                                                      repRangeMax:
                                                        set.repRangeMax || 0,
                                                      reps: undefined,
                                                    },
                                                  );
                                                }
                                              }}
                                            >
                                              <SelectTrigger
                                                size="sm"
                                                className="bg-transparent! border-0 w-auto"
                                              >
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectGroup>
                                                  <SelectLabel>
                                                    Select rep type
                                                  </SelectLabel>
                                                  <SelectItem value="reps">
                                                    Reps
                                                  </SelectItem>
                                                  <SelectItem value="repRange">
                                                    Rep Range
                                                  </SelectItem>
                                                </SelectGroup>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {set.repType === "reps" ? (
                                            <Input
                                              type="number"
                                              placeholder="0"
                                              value={set.reps || ""}
                                              onChange={(e) =>
                                                updateSet(
                                                  exercise.folder,
                                                  setIndex,
                                                  {
                                                    reps:
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 0,
                                                  },
                                                )
                                              }
                                              className="w-24"
                                            />
                                          ) : (
                                            <div className="flex gap-2 items-center">
                                              <Input
                                                type="number"
                                                placeholder="Min"
                                                value={set.repRangeMin || ""}
                                                onChange={(e) =>
                                                  updateSet(
                                                    exercise.folder,
                                                    setIndex,
                                                    {
                                                      repRangeMin:
                                                        parseInt(
                                                          e.target.value,
                                                        ) || 0,
                                                    },
                                                  )
                                                }
                                                className="w-20"
                                              />
                                              <span>-</span>
                                              <Input
                                                type="number"
                                                placeholder="Max"
                                                value={set.repRangeMax || ""}
                                                onChange={(e) =>
                                                  updateSet(
                                                    exercise.folder,
                                                    setIndex,
                                                    {
                                                      repRangeMax:
                                                        parseInt(
                                                          e.target.value,
                                                        ) || 0,
                                                    },
                                                  )
                                                }
                                                className="w-20"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Add new set form */}
                          <div className="w-full border-t pt-4">
                            <div className="w-full flex justify-between items-center gap-2">
                              <div className="w-fit flex flex-col">
                                <h2 className="text-sm">Set</h2>
                                <Input
                                  className="w-20"
                                  type="number"
                                  placeholder={
                                    workoutExercise?.sets.length
                                      ? (
                                          workoutExercise.sets.length + 1
                                        ).toString()
                                      : "1"
                                  }
                                  disabled
                                  value={
                                    workoutExercise?.sets.length
                                      ? workoutExercise.sets.length + 1
                                      : 1
                                  }
                                />
                              </div>
                              <div className="w-fit">
                                <h2 className="text-sm">kgs</h2>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={setForm?.weight || ""}
                                  onChange={(e) =>
                                    updateSetForm(
                                      exercise.folder,
                                      "weight",
                                      e.target.value,
                                    )
                                  }
                                  className="w-24"
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <h2 className="text-sm">Reps</h2>
                                  <Select
                                    value={setForm?.repType || "reps"}
                                    onValueChange={(
                                      value: "reps" | "repRange",
                                    ) =>
                                      updateSetForm(
                                        exercise.folder,
                                        "repType",
                                        value,
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      size="sm"
                                      className="bg-transparent! border-0 w-auto"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>
                                          Select rep type
                                        </SelectLabel>
                                        <SelectItem value="reps">
                                          Reps
                                        </SelectItem>
                                        <SelectItem value="repRange">
                                          Rep Range
                                        </SelectItem>
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {setForm?.repType === "reps" ? (
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={setForm?.reps || ""}
                                    onChange={(e) =>
                                      updateSetForm(
                                        exercise.folder,
                                        "reps",
                                        e.target.value,
                                      )
                                    }
                                    className="w-24"
                                  />
                                ) : (
                                  <div className="flex gap-2 items-center">
                                    <Input
                                      type="number"
                                      placeholder="Min"
                                      value={setForm?.repRangeMin || ""}
                                      onChange={(e) =>
                                        updateSetForm(
                                          exercise.folder,
                                          "repRangeMin",
                                          e.target.value,
                                        )
                                      }
                                      className="w-20"
                                    />
                                    <span>-</span>
                                    <Input
                                      type="number"
                                      placeholder="Max"
                                      value={setForm?.repRangeMax || ""}
                                      onChange={(e) =>
                                        updateSetForm(
                                          exercise.folder,
                                          "repRangeMax",
                                          e.target.value,
                                        )
                                      }
                                      className="w-20"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => addSet(exercise.folder)}
                              className="w-full mt-3"
                            >
                              Add set
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedExercises.length > 0 && (
                <button
                  onClick={handleSaveWorkout}
                  className="w-full bg-yellow-300 text-black font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-yellow-400 mt-4"
                >
                  Create Workout ({selectedExercises.length} exercises)
                </button>
              )}
            </div>

            {/* Right Column - Exercise Library */}
            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Exercise Library</h3>
                  <Input
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="border rounded-lg p-4 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
                        <p className="text-gray-500">Loading exercises...</p>
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
                      {filteredExercises.map((exercise) => {
                        const exerciseData =
                          exercise.jsonContents?.[0]?.content;
                        const primaryMuscles =
                          exerciseData?.primaryMuscles?.join(", ") || "N/A";

                        return (
                          <motion.div
                            key={exercise.folder}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center justify-start py-1 overflow-hidden cursor-pointer w-full"
                            onClick={() => addExercise(exercise)}
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
                                    <span className="text-yellow-300 font-medium text-[10px] rounded capitalize">
                                      {primaryMuscles}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  {selectedExercises.find(
                                    (e) => e.folder === exercise.folder,
                                  ) && (
                                    <CircleCheck
                                      size={20}
                                      className="fill-yellow-300 stroke-black [&>circle]:stroke-none"
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
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default CreateWorkoutModal;
