import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "./ui/input";
import { getFoldersAndContents } from "@/hooks/getExerciseByName";
import { CircleCheck } from "lucide-react";

interface ExerciseJsonContent {
  [key: string]: any;
}

interface Exercise {
  folder: string;
  images: string[];
  jsonContents: ExerciseJsonContent[];
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

  const addExercise = (exercise: Exercise) => {
    if (!selectedExercises.find((e) => e.folder === exercise.folder)) {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const removeExercise = (exerciseToRemove: Exercise) => {
    setSelectedExercises(
      selectedExercises.filter(
        (exercise) => exercise.folder !== exerciseToRemove.folder,
      ),
    );
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
        className="fixed inset-0 bg-black/50 z-40"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-6xl"
      >
        <div className="bg-white dark:bg-[#1a1a1b] rounded-lg shadow-xl p-6 m-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column - Workout Details */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg tracking-tight font-bold">
                  New Workout
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <Input
                placeholder="Workout name"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Selected Exercises</h3>
                {selectedExercises.length === 0 ? (
                  <div className="text-gray-500">
                    <p>No exercises added yet</p>
                    <p className="text-sm">
                      Click on exercises from the right panel to add them
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedExercises.map((exercise, index) => (
                      <div
                        key={exercise.folder}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{index + 1}.</span>
                          <span>{exercise.folder.replace(/_/g, " ")}</span>
                        </div>
                        <button
                          onClick={() => removeExercise(exercise)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedExercises.length > 0 && (
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
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
                        const secondaryMuscles =
                          exerciseData?.secondaryMuscles?.join(", ") || "None";

                        return (
                          <motion.div
                            key={exercise.folder}
                            whileHover={{ scale: 1.02 }}
                            className=" flex items-center justify-start py-1 overflow-hidden cursor-pointer w-full"
                            onClick={() => addExercise(exercise)}
                          >
                            <div className="flex items-center justify-center w-full">
                              {/* Image */}
                              <div className="flex-shrink-0">
                                {exercise.images[0] && (
                                  <img
                                    src={exercise.images[0]}
                                    alt={exercise.folder}
                                    className="w-10 h-10 rounded-full object-cover grayscale-100"
                                  />
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex items-center justify-between w-full">
                                <div className="ml-3 flex-1">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-[14px] font-medium">
                                      {exerciseData?.name ||
                                        exercise.folder.replace(/_/g, " ")}
                                    </h4>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {/* text-[#2563EB] */}
                                    <span className="px-2 py-1 bg-[#FAF6FA] text-green-700 font-medium text-[10px] rounded capitalize">
                                      {primaryMuscles}
                                    </span>
                                  </div>
                                  {/* {exerciseData?.instructions?.[0] && (
                                      <div className="mt-2 text-xs text-gray-500 line-clamp-2">
                                        💡 {exerciseData.instructions[0]}
                                      </div>
                                    )} */}
                                </div>
                                <div>
                                  {selectedExercises.find(
                                    (e) => e.folder === exercise.folder,
                                  ) && (
                                    <CircleCheck
                                      size={17}
                                      fill="#9eed00"
                                      stroke="white"
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
