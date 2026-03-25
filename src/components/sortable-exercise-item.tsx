/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type { Exercise, Set, WorkoutExercise } from "./create-workout-modal";
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
import SortableSetItem from "./Sortable-Set-Item";
import { Button } from "./ui/button";

const SortableExerciseItem: React.FC<{
  exercise: Exercise;
  workoutExercise: WorkoutExercise;
  setForm: any;
  updateWorkoutExercise: (
    folder: string,
    updates: Partial<WorkoutExercise>,
  ) => void;
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
  setForm,
  updateWorkoutExercise,
  updateSet,
  addSet,
  removeSet,
  updateSetForm,
  removeExercise,
  onSetDragEnd,
  onSetDragStart,
  sensors,
}) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex flex-col gap-4 bg-accent rounded-xl px-3 py-4"
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

      {/* Display existing sets - now sortable */}
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
              <div className="space-y-3">
                {workoutExercise.sets.map((set, setIndex) => (
                  <SortableSetItem
                    key={`${exercise.folder}-set-${setIndex}`}
                    set={set}
                    setIndex={setIndex}
                    folder={exercise.folder}
                    updateSet={updateSet}
                    removeSet={removeSet}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
                  ? (workoutExercise.sets.length + 1).toString()
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
                updateSetForm(exercise.folder, "weight", e.target.value)
              }
              className="w-24"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-sm">Reps</h2>
              <Select
                value={setForm?.repType || "reps"}
                onValueChange={(value: "reps" | "repRange") =>
                  updateSetForm(exercise.folder, "repType", value)
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
                    <SelectLabel>Select rep type</SelectLabel>
                    <SelectItem value="reps">Reps</SelectItem>
                    <SelectItem value="repRange">Rep Range</SelectItem>
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
                  updateSetForm(exercise.folder, "reps", e.target.value)
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
        <Button onClick={() => addSet(exercise.folder)} className="w-full mt-3">
          Add set
        </Button>
      </div>
    </div>
  );
};

export default SortableExerciseItem;
