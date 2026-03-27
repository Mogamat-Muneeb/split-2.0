// // import type { ActiveWorkout } from "@/lib/types";
// // import { useLogWorkout } from "@/provider/LogWorkoutProvider";
// // import { Check } from "lucide-react";
// // import React from "react";

// // interface LoggingWorkoutProps {
// //   activeWorkout: ActiveWorkout | null;
// // }

// // const LoggingWorkout: React.FC<LoggingWorkoutProps> = ({ activeWorkout }) => {
// //   const { updateSet } = useLogWorkout();

// //   const formatRestTimer = (timer: string) => {
// //     const value = parseInt(timer);
// //     const unit = timer.replace(/[0-9]/g, "");

// //     if (unit === "s" || unit === "sec") {
// //       return `${value}s`;
// //     } else if (unit === "m" || unit === "min") {
// //       return `${value}m`;
// //     } else if (unit === "h" || unit === "hr") {
// //       return `${value}h`;
// //     }

// //     if (timer.includes(":")) {
// //       const [minutes, seconds] = timer.split(":");
// //       if (minutes === "0") {
// //         return `${seconds}s`;
// //       } else if (seconds === "00") {
// //         return `${minutes}m`;
// //       } else {
// //         return `${minutes}m ${seconds}s`;
// //       }
// //     }

// //     return timer;
// //   };

// //   return (
// //     <div className="space-y-4">
// //       {activeWorkout?.exercises?.map((exercise) => (
// //         <div key={exercise.id} className=" bg-accent rounded-lg p-4">
// //           <div className="flex gap-2 items-center">
// //             {exercise.exercise_image && (
// //               <img
// //                 src={exercise.exercise_image}
// //                 alt={exercise.name}
// //                 className="w-10 h-10 rounded-full object-cover grayscale-100"
// //               />
// //             )}

// //             <h3 className="font-medium my-4">{exercise.name}</h3>
// //           </div>

// //           <div className="flex flex-col gap-2 mb-10">
// //             {exercise.notes && <p className="mt-2 text-sm">{exercise.notes}</p>}
// //             {exercise.rest_timer && (
// //               <p className="text-sm">
// //                 <span className="text-orange-600 "> Rest Timer: </span>
// //                 <span className="lowercase">
// //                   {formatRestTimer(exercise.rest_timer)}
// //                 </span>
// //               </p>
// //             )}
// //           </div>

// //           <div className="">
// //             <div className="grid grid-cols-5 px-2 items-center w-full mb-4 text-xs tracking-tight">
// //               <div>SET</div>
// //               <div className="flex items-center justify-center w-full">
// //                 PREV
// //               </div>
// //               <div className="flex items-center justify-center w-full ">KG</div>
// //               <div className=" flex items-center justify-center w-full">
// //                 <p>REPS</p>
// //               </div>
// //               <div className="flex items-center justify-end">
// //                 <Check />
// //               </div>
// //             </div>

// //             {exercise.sets.map((set, setIndex) => (
// //               <div
// //                 key={set.id}
// //                 className={`grid grid-cols-5 items-center text-sm p-4
// //                   ${
// //                     set.checked
// //                       ? "bg-orange-700/30 "
// //                       : setIndex % 2 === 1
// //                         ? ""
// //                         : "bg-background"
// //                   }
// //                 `}
// //               >
// //                 <div>{set.set_number}</div>

// //                 <div className="flex  items-center justify-center w-full">
// //                   -
// //                 </div>

// //                 <div className="flex  items-center justify-center w-full">
// //                   {set.weight} kg
// //                 </div>

// //                 <div className="flex  items-center justify-center w-full">
// //                   {set.reps !== null
// //                     ? `${set.reps} `
// //                     : ` ${set.rep_range_min}-${set.rep_range_max}`}
// //                 </div>

// //                 <div className="flex justify-end">
// //                   <input
// //                     className="accent-orange-700"
// //                     type="checkbox"
// //                     checked={set.checked || false}
// //                     onChange={() =>
// //                       updateSet(exercise.id, set.id, {
// //                         checked: !set.checked,
// //                       })
// //                     }
// //                   />
// //                 </div>
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       ))}

// //       <div>
// //         <Button>Add exercise</Button>
// //       </div>
// //     </div>
// //   );
// // };

// // export default LoggingWorkout;

// import type { ActiveWorkout } from "@/lib/types";
// import { useLogWorkout } from "@/provider/LogWorkoutProvider";
// import { Check, Plus, Edit2, X, Trash2 } from "lucide-react";
// import React, { useState } from "react";
// import { Button } from "./ui/button";
// import AddExerciseToWorkoutModal from "./AddExerciseToWorkoutModal";

// interface LoggingWorkoutProps {
//   activeWorkout: ActiveWorkout | null;
// }

// const LoggingWorkout: React.FC<LoggingWorkoutProps> = ({ activeWorkout }) => {
//   const { updateSet, addExercise, addSet, removeSet } = useLogWorkout();
//   const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
//   const [editingSet, setEditingSet] = useState<{
//     exerciseId: string;
//     setId: string;
//     field: "weight" | "reps";
//     value: string;
//   } | null>(null);

//   const formatRestTimer = (timer: string) => {
//     const value = parseInt(timer);
//     const unit = timer.replace(/[0-9]/g, "");

//     if (unit === "s" || unit === "sec") {
//       return `${value}s`;
//     } else if (unit === "m" || unit === "min") {
//       return `${value}m`;
//     } else if (unit === "h" || unit === "hr") {
//       return `${value}h`;
//     }

//     if (timer.includes(":")) {
//       const [minutes, seconds] = timer.split(":");
//       if (minutes === "0") {
//         return `${seconds}s`;
//       } else if (seconds === "00") {
//         return `${minutes}m`;
//       } else {
//         return `${minutes}m ${seconds}s`;
//       }
//     }

//     return timer;
//   };

//   const handleAddExercise = (exercise: any) => {
//     addExercise(exercise);
//     setIsAddExerciseModalOpen(true);
//   };

//   const startEditing = (
//     exerciseId: string,
//     setId: string,
//     field: "weight" | "reps",
//     currentValue: number | null
//   ) => {
//     setEditingSet({
//       exerciseId,
//       setId,
//       field,
//       value: currentValue?.toString() || "",
//     });
//   };

//   const cancelEditing = () => {
//     setEditingSet(null);
//   };

//   const saveEditing = (exerciseId: string, setId: string, field: "weight" | "reps") => {
//     if (!editingSet) return;

//     const newValue = editingSet.value === "" ? null : parseFloat(editingSet.value);

//     if (field === "weight") {
//       updateSet(exerciseId, setId, { weight: newValue || 0 });
//     } else if (field === "reps") {
//       updateSet(exerciseId, setId, { reps: newValue || null });
//     }

//     setEditingSet(null);
//   };

//   const handleKeyPress = (
//     e: React.KeyboardEvent,
//     exerciseId: string,
//     setId: string,
//     field: "weight" | "reps"
//   ) => {
//     if (e.key === "Enter") {
//       saveEditing(exerciseId, setId, field);
//     } else if (e.key === "Escape") {
//       cancelEditing();
//     }
//   };

//   const handleAddSet = (exerciseId: string) => {
//     const exercise = activeWorkout?.exercises?.find(e => e.id === exerciseId);
//     if (!exercise) return;

//     // Get the last set to copy its values
//     const lastSet = exercise.sets[exercise.sets.length - 1];

//     addSet(exerciseId, {
//       set_number: exercise.sets.length + 1,
//       weight: lastSet?.weight || 0,
//       reps: lastSet?.reps || null,
//       rep_range_min: lastSet?.rep_range_min || null,
//       rep_range_max: lastSet?.rep_range_max || null,
//       checked: false,
//     });
//   };

//   const handleRemoveSet = (exerciseId: string, setId: string) => {
//     if (confirm("Are you sure you want to remove this set?")) {
//       removeSet(exerciseId, setId);
//     }
//   };

//   return (
//     <div className={``}>
//       <div className="space-y-4">
//         {activeWorkout?.exercises?.map((exercise) => (
//           <div key={exercise.id} className="bg-accent rounded-lg p-4">
//             <div className="flex gap-2 items-center justify-between">
//               <div className="flex gap-2 items-center">
//                 {exercise.exercise_image && (
//                   <img
//                     src={exercise.exercise_image}
//                     alt={exercise.name}
//                     className="w-10 h-10 rounded-full object-cover grayscale-100"
//                   />
//                 )}
//                 <h3 className="font-medium my-4">{exercise.name}</h3>
//               </div>

//               <Button
//                 onClick={() => handleAddSet(exercise.id)}
//                 size="sm"
//                 variant="outline"
//                 className="text-xs"
//               >
//                 <Plus className="w-3 h-3 mr-1" />
//                 Add Set
//               </Button>
//             </div>

//             <div className="flex flex-col gap-2 mb-10">
//               {exercise.notes && (
//                 <p className="mt-2 text-sm">{exercise.notes}</p>
//               )}
//               {exercise.rest_timer && (
//                 <p className="text-sm">
//                   <span className="text-orange-600">Rest Timer: </span>
//                   <span className="lowercase">
//                     {formatRestTimer(exercise.rest_timer)}
//                   </span>
//                 </p>
//               )}
//             </div>

//             <div className="">
//               <div className="grid grid-cols-6 px-2 items-center w-full mb-4 text-xs tracking-tight">
//                 <div>SET</div>
//                 <div className="flex items-center justify-center w-full">
//                   PREV
//                 </div>
//                 <div className="flex items-center justify-center w-full">
//                   KG
//                 </div>
//                 <div className="flex items-center justify-center w-full">
//                   <p>REPS</p>
//                 </div>
//                 <div className="flex items-center justify-center w-full">
//                   DONE
//                 </div>
//                 <div className="flex items-center justify-end">
//                   ACTIONS
//                 </div>
//               </div>

//               {exercise.sets.map((set, setIndex) => (
//                 <div
//                   key={set.id}
//                   className={`grid grid-cols-6 items-center text-sm p-4
//                     ${
//                       set.checked
//                         ? "bg-orange-700/30 "
//                         : setIndex % 2 === 1
//                           ? ""
//                           : "bg-background"
//                     }
//                   `}
//                 >
//                   <div>{set.set_number}</div>

//                   <div className="flex items-center justify-center w-full">
//                     -
//                   </div>

//                   {/* Editable Weight */}
//                   <div className="flex items-center justify-center w-full">
//                     {editingSet?.exerciseId === exercise.id &&
//                      editingSet?.setId === set.id &&
//                      editingSet?.field === "weight" ? (
//                       <div className="flex items-center gap-1">
//                         <input
//                           type="number"
//                           value={editingSet.value}
//                           onChange={(e) =>
//                             setEditingSet({ ...editingSet, value: e.target.value })
//                           }
//                           onKeyDown={(e) => handleKeyPress(e, exercise.id, set.id, "weight")}
//                           className="w-16 px-2 py-1 text-center bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
//                           autoFocus
//                         />
//                         <button
//                           onClick={() => saveEditing(exercise.id, set.id, "weight")}
//                           className="p-1 hover:bg-green-500/20 rounded"
//                         >
//                           <Check size={14} className="text-green-600" />
//                         </button>
//                         <button
//                           onClick={cancelEditing}
//                           className="p-1 hover:bg-red-500/20 rounded"
//                         >
//                           <X size={14} className="text-red-600" />
//                         </button>
//                       </div>
//                     ) : (
//                       <div
//                         onClick={() => startEditing(exercise.id, set.id, "weight", set.weight)}
//                         className="cursor-pointer hover:bg-orange-600/20 px-2 py-1 rounded transition-colors group flex items-center gap-1"
//                       >
//                         <span>{set.weight} kg</span>
//                         <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
//                       </div>
//                     )}
//                   </div>

//                   {/* Editable Reps */}
//                   <div className="flex items-center justify-center w-full">
//                     {editingSet?.exerciseId === exercise.id &&
//                      editingSet?.setId === set.id &&
//                      editingSet?.field === "reps" ? (
//                       <div className="flex items-center gap-1">
//                         <input
//                           type="number"
//                           value={editingSet.value}
//                           onChange={(e) =>
//                             setEditingSet({ ...editingSet, value: e.target.value })
//                           }
//                           onKeyDown={(e) => handleKeyPress(e, exercise.id, set.id, "reps")}
//                           className="w-16 px-2 py-1 text-center bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
//                           autoFocus
//                         />
//                         <button
//                           onClick={() => saveEditing(exercise.id, set.id, "reps")}
//                           className="p-1 hover:bg-green-500/20 rounded"
//                         >
//                           <Check size={14} className="text-green-600" />
//                         </button>
//                         <button
//                           onClick={cancelEditing}
//                           className="p-1 hover:bg-red-500/20 rounded"
//                         >
//                           <X size={14} className="text-red-600" />
//                         </button>
//                       </div>
//                     ) : (
//                       <div
//                         onClick={() => startEditing(
//                           exercise.id,
//                           set.id,
//                           "reps",
//                           set.reps !== null ? set.reps : null
//                         )}
//                         className="cursor-pointer hover:bg-orange-600/20 px-2 py-1 rounded transition-colors group flex items-center gap-1"
//                       >
//                         <span>
//                           {set.reps !== null
//                             ? `${set.reps} `
//                             : `${set.rep_range_min}-${set.rep_range_max}`}
//                         </span>
//                         <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
//                       </div>
//                     )}
//                   </div>

//                   <div className="flex items-center justify-center w-full">
//                     <input
//                       className="accent-orange-700"
//                       type="checkbox"
//                       checked={set.checked || false}
//                       onChange={() =>
//                         updateSet(exercise.id, set.id, {
//                           checked: !set.checked,
//                         })
//                       }
//                     />
//                   </div>

//                   <div className="flex items-center justify-end">
//                     <button
//                       onClick={() => handleRemoveSet(exercise.id, set.id)}
//                       className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
//                     >
//                       <Trash2 size={16} className="text-red-600" />
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}

//         <div>
//           <Button
//             onClick={() => setIsAddExerciseModalOpen(true)}
//             className="w-full"
//           >
//             <Plus className="w-4 h-4 mr-2" />
//             Add Exercise
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoggingWorkout;

import type { ActiveWorkout } from "@/lib/types";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import { Check, Plus, Edit2, X, Trash2 } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import AddExerciseToWorkoutModal from "./AddExerciseToWorkoutModal";
import { Input } from "./ui/input";

interface LoggingWorkoutProps {
  activeWorkout: ActiveWorkout | null;
}

const LoggingWorkout: React.FC<LoggingWorkoutProps> = ({ activeWorkout }) => {
  const { updateSet, addExercise, addSet, removeSet } = useLogWorkout();
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<{
    exerciseId: string;
    setId: string;
    field: "weight" | "reps";
    value: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleAddExercise = (exercise: any) => {
    addExercise(exercise);
    setIsAddExerciseModalOpen(true);
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

    // Get the last set to copy its values
    const lastSet = exercise.sets[exercise.sets.length - 1];

    addSet(exerciseId, {
      set_number: exercise.sets.length + 1,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || null,
      rep_range_min: lastSet?.rep_range_min || null,
      rep_range_max: lastSet?.rep_range_max || null,
      checked: false,
    });
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    if (confirm("Are you sure you want to remove this set?")) {
      removeSet(exerciseId, setId);
    }
  };

  return (
    <div className={``}>
      <div className="space-y-4">
        {activeWorkout?.exercises?.map((exercise) => (
          <div key={exercise.id} className="bg-accent rounded-lg p-4">
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
              <div className="grid grid-cols-5 px-2 items-center w-full mb-4 gap-2 text-xs tracking-tight">
                <div>SET</div>
                <div className="flex items-center justify-center w-full">
                  PREV
                </div>
                <div className="flex items-center justify-center w-full">
                  KG
                </div>
                <div className="flex items-center justify-center w-full">
                  <p>REPS</p>
                </div>
                <div className="flex items-center justify-center w-full">
                  DONE
                </div>
                {/* <div className="flex items-center justify-end">ACTIONS</div> */}
              </div>

              {exercise.sets.map((set, setIndex) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-5 gap-2 items-center text-sm p-4 group
                    ${
                      set.checked
                        ? "bg-orange-700/30 "
                        : setIndex % 2 === 1
                          ? ""
                          : "bg-background"
                    }
                  `}
                >
                  <div>{set.set_number}</div>

                  <div className="flex items-center justify-center w-full">
                    -
                  </div>

                  {/* Editable Weight */}
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
                          handleKeyPress(e, exercise.id, set.id, "weight")
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
                        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary border-0 selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md  bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      >
                        <span>{set.weight} kg</span>
                      </div>
                    )}
                  </div>

                  {/* Editable Reps */}
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
                    ) : (
                      <div
                        onClick={() =>
                          startEditing(
                            exercise.id,
                            set.id,
                            "reps",
                            set.reps !== null ? set.reps : null,
                          )
                        }
                        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary border-0 selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md  bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      >
                        <span>
                          {set.reps !== null
                            ? `${set.reps} `
                            : `${set.rep_range_min}-${set.rep_range_max}`}
                        </span>
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

                  {/* <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleRemoveSet(exercise.id, set.id)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div> */}
                </div>
              ))}

<Button
                onClick={() => handleAddSet(exercise.id)}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Set
              </Button>
            </div>
          </div>
        ))}

            

        {/* <div>
          <Button
            onClick={() => setIsAddExerciseModalOpen(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
        </div> */}
      </div>
    </div>
  );
};

export default LoggingWorkout;
