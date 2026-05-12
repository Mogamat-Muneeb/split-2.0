import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dumbbell, GripVertical, Trash2 } from "lucide-react";
import type { PlanExercise, PlanSet } from "./types";
import {
  getColorForMuscle,
  getExercisePrimaryMuscleKeys,
} from "./utils";

type SortablePlanExerciseProps = {
  item: PlanExercise;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  updateSet: (
    exerciseId: string,
    setIndex: number,
    updates: Partial<PlanSet>,
  ) => void;
  removeExercise: (exerciseId: string) => void;
  updateDetails: (
    exerciseId: string,
    updates: Partial<Pick<PlanExercise, "notes" | "restTimer">>,
  ) => void;
  updateRepType: (exerciseId: string, repType: "reps" | "repRange") => void;
};

export function SortablePlanExercise({
  item,
  addSet,
  removeSet,
  updateSet,
  removeExercise,
  updateDetails,
  updateRepType,
}: SortablePlanExerciseProps) {
  const id = item.id;
  const name =
    item?.exercise?.jsonContents?.[0]?.content?.name || item.exercise.folder;
  const muscleAccent = getColorForMuscle(
    getExercisePrimaryMuscleKeys(item.exercise)[0],
  );
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="bg-accent p-3 rounded-2xl mb-2 text-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center w-full gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="flex shrink-0 items-center justify-center rounded-xl p-2  ring-black/10 dark:ring-white/15"
              style={{
                color: muscleAccent,
                backgroundColor: `${muscleAccent}26`,
              }}
              aria-hidden
            >
              <Dumbbell size={8} strokeWidth={2} />
            </div>
            <div className="shrink-0">
              {item.exercise.images[0] && (
                <img
                  src={item.exercise.images[0]}
                  alt={item.exercise.folder}
                  className="w-10 h-10 rounded-full object-cover grayscale-100"
                />
              )}
            </div>
            <span className="min-w-0 truncate font-medium">{name}</span>
          </div>
        </div>
        <button onClick={() => removeExercise(item.id)}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="w-full mb-3">
        <h2 className="text-sm font-medium mb-2">Notes</h2>
        <Textarea
          placeholder="Any notes"
          className="min-w-4"
          value={item.notes}
          onChange={(e) => updateDetails(item.id, { notes: e.target.value })}
        />
      </div>

      <div className="w-full mb-3">
        <h2 className="text-sm font-medium mb-2">Rest Timer</h2>
        <Select
          value={item.restTimer}
          onValueChange={(value) =>
            updateDetails(item.id, { restTimer: value })
          }
        >
          <SelectTrigger className="w-fit max-h-fit bg-white dark:bg-neutral-800">
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

      <div className="space-y-2">
        <div className="grid grid-cols-4 px-2 items-center w-full text-xs tracking-tight gap-2">
          <div className="flex items-center">SET</div>

          <div className="flex items-center justify-center">KG</div>
          <div className="flex flex-col items-center justify-center w-full">
            <Select
              value={item.sets[0]?.repType || "reps"}
              onValueChange={(value: "reps" | "repRange") =>
                updateRepType(item.id, value)
              }
            >
              <SelectTrigger
                size="sm"
                className="border-0 w-auto p-1 bg-transparent!"
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

        {item.sets.map((set, index) => (
          <div
            key={`${item.id}-set-${index}`}
            className="grid grid-cols-4 gap-2 items-center"
          >
            <Select
              value={set.type || "Normal"}
              onValueChange={(value: PlanSet["type"]) =>
                updateSet(item.id, index, { type: value })
              }
            >
              <SelectTrigger
                size="sm"
                className="border-0 w-auto p-1 ring-0 bg-transparent! relative"
              >
                <div className="opacity-0! absolute!">
                  <SelectValue />
                </div>

                <div className="flex items-center">
                  {set.type === "Warm Up" && (
                    <div className="text-yellow-600! font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
                      W
                    </div>
                  )}
                  {set.type === "Normal" && (
                    <div className="font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
                      {index + 1}
                    </div>
                  )}
                  {set.type === "Failure" && (
                    <div className="text-red-600! font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
                      F
                    </div>
                  )}
                  {set.type === "Drop" && (
                    <div className="text-blue-600! font-extrabold bg-input/30 h-7 w-7 flex justify-center items-center rounded">
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
                        {index + 1}
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
            <Input
              type="number"
              value={set.weight}
              onChange={(e) =>
                updateSet(item.id, index, {
                  weight: Number(e.target.value) || 0,
                })
              }
              placeholder="Kg"
            />
            {set.repType === "reps" ? (
              <Input
                type="number"
                value={set.reps ?? ""}
                onChange={(e) =>
                  updateSet(item.id, index, {
                    reps: Number(e.target.value) || 0,
                  })
                }
                placeholder="Reps"
              />
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={set.repRangeMin ?? ""}
                  onChange={(e) =>
                    updateSet(item.id, index, {
                      repRangeMin: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="Min"
                />
                <Input
                  type="number"
                  value={set.repRangeMax ?? ""}
                  onChange={(e) =>
                    updateSet(item.id, index, {
                      repRangeMax: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="Max"
                />
              </div>
            )}
            <button
              onClick={() => removeSet(item.id, index)}
              className="text-xs px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-800"
            >
              -
            </button>
          </div>
        ))}
      </div>

      <Button onClick={() => addSet(item.id)} className="w-full mt-3">
        Add set
      </Button>
    </div>
  );
}

