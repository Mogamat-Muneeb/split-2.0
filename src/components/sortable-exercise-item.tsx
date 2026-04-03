/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EllipsisVertical, GripVertical } from "lucide-react";

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
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { Exercise, WorkoutExercise } from "@/lib/types";
import SortableSetItem from "./sortable-set-item";

const SortableExerciseItem: React.FC<{
  exercise: Exercise;
  workoutExercise: WorkoutExercise;
  setForm: any;
  updateWorkoutExercise: (
    folder: string,
    updates: Partial<WorkoutExercise>,
  ) => void;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  updateSet: (folder: string, setIndex: number, updates: Partial<Set>) => void;
  addSet: (folder: string) => void;
  removeSet: (folder: string, setIndex: number) => void;
  updateSetForm: (folder: string, field: string, value: any) => void;
  removeExercise: (exercise: Exercise) => void;
  onSetDragEnd: (event: DragEndEvent, folder: string) => void;
  onSetDragStart: (event: DragStartEvent, folder: string) => void;
  sensors: any;
}> = ({
  exercise,
  workoutExercise,
  updateWorkoutExercise,
  updateSet,
  addSet,
  removeSet,
  removeExercise,
  onSetDragEnd,
  onSetDragStart,
  sensors,
}) => {
  console.log("🚀 ~ SortableExerciseItem ~ exercise:", exercise)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.folder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const WEIGHT_CATEGORIES = [
    "strength",
    "powerlifting",
    "olympic weightlifting",
    "strongman",
  ];

  const shouldShowWeight = (category?: string) =>
    WEIGHT_CATEGORIES.includes(category || "");

  const category = exercise.jsonContents?.[0]?.content?.category || "";

  const showWeight = shouldShowWeight(category);
  console.log("🚀 ~ SortableExerciseItem ~ exercise:", exercise);
  console.log("🚀 ~ SortableExerciseItem ~ showWeight:", showWeight);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex flex-col gap-4 bg-accent rounded-xl p-4"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center w-full gap-2">
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
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
            <EllipsisVertical size={18} className="cursor-pointer" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="start">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => removeExercise(exercise)}>
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
        <h2 className="text-sm font-medium mb-2">Rest Timer</h2>
        <Select
          value={workoutExercise?.restTimer || "off"}
          onValueChange={(value) =>
            updateWorkoutExercise(exercise.folder, {
              restTimer: value,
            })
          }
        >
          <SelectTrigger className="w-fit max-h-fit">
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

      {workoutExercise?.sets && workoutExercise.sets.length > 0 && (
        <div className="w-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => onSetDragStart(event, exercise.folder)}
            onDragEnd={(event) => onSetDragEnd(event, exercise.folder)}
          >
            <SortableContext
              items={workoutExercise.sets.map(
                (_, index) => `${exercise.folder}-set-${index}`,
              )}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-4 px-2 items-center w-full  !text-xs tracking-tight gap-2">
                <div className="flex items-center">
                  <div className="w-7"></div>
                  <div>SET</div>
                </div>

                {showWeight && (
                  <div className="flex items-center justify-center w-full">
                    KG
                  </div>
                )}
                <div className="flex flex-col items-center justify-center w-full">
                  <Select
                    value={workoutExercise.sets[0]?.repType || "reps"}
                    onValueChange={(value: "reps" | "repRange") => {
                      // Create updated sets array
                      const updatedSets = workoutExercise.sets.map((set) => ({
                        ...set,
                        repType: value,
                        ...(value === "reps"
                          ? {
                              reps: set.reps || 0,
                              repRangeMin: undefined,
                              repRangeMax: undefined,
                            }
                          : {
                              reps: undefined,
                              repRangeMin: set.repRangeMin || 0,
                              repRangeMax: set.repRangeMax || 0,
                            }),
                      }));

                      // Update the entire workout exercise with all sets at once
                      updateWorkoutExercise(exercise.folder, {
                        sets: updatedSets,
                      });
                    }}
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
                        <SelectItem value="repRange">Rep Range</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-end"></div>
              </div>

              <div className="">
                {workoutExercise.sets.map((set, setIndex) => (
                  <SortableSetItem
                    key={`${exercise.folder}-set-${setIndex}`}
                    set={set}
                    setIndex={setIndex}
                    folder={exercise.folder}
                    updateSet={updateSet}
                    removeSet={removeSet}
                    showWeight={showWeight}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
      <Button onClick={() => addSet(exercise.folder)} className="w-full mt-3">
        Add set
      </Button>
    </div>
  );
};

export default SortableExerciseItem;
