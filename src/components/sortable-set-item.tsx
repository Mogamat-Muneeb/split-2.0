import React from "react";
import type { Set } from "./create-workout-modal";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SortableSetItem: React.FC<{
  set: Set;
  setIndex: number;
  folder: string;
  updateSet: (folder: string, setIndex: number, updates: Partial<Set>) => void;
  removeSet: (folder: string, setIndex: number) => void;
}> = ({ set, setIndex, folder, updateSet, removeSet }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${folder}-set-${setIndex}` });

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
      className="flex flex-col gap-2 p-3 bg-background rounded-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </div>
          <h3 className="text-sm font-medium">Set {setIndex + 1}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeSet(folder, setIndex)}
          className="p-0"
        >
          <Trash2 size={16} />
        </Button>
      </div>
      <div className="w-full flex justify-between items-center gap-2">
        <div className="w-fit flex flex-col">
          <h2 className="text-sm">Set</h2>
          <Input className="w-12" type="number" disabled value={setIndex + 1} />
        </div>
        <div className="w-fit">
          <h2 className="text-sm">kgs</h2>
          <Input
            type="number"
            placeholder="0"
            value={set.weight || ""}
            onChange={(e) =>
              updateSet(folder, setIndex, {
                weight: parseFloat(e.target.value) || 0,
              })
            }
            className="w-24"
          />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-sm">Reps</h2>
            <Select
              value={set.repType}
              onValueChange={(value: "reps" | "repRange") => {
                if (value === "reps") {
                  updateSet(folder, setIndex, {
                    repType: "reps",
                    reps: set.reps || 0,
                    repRangeMin: undefined,
                    repRangeMax: undefined,
                  });
                } else {
                  updateSet(folder, setIndex, {
                    repType: "repRange",
                    repRangeMin: set.repRangeMin || 0,
                    repRangeMax: set.repRangeMax || 0,
                    reps: undefined,
                  });
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
                  <SelectLabel>Select rep type</SelectLabel>
                  <SelectItem value="reps">Reps</SelectItem>
                  <SelectItem value="repRange">Rep Range</SelectItem>
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
                updateSet(folder, setIndex, {
                  reps: parseInt(e.target.value) || 0,
                })
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
                  updateSet(folder, setIndex, {
                    repRangeMin: parseInt(e.target.value) || 0,
                  })
                }
                className="w-20"
              />
              <span>-</span>
              <Input
                type="number"
                placeholder="Max"
                value={set.repRangeMax || ""}
                onChange={(e) =>
                  updateSet(folder, setIndex, {
                    repRangeMax: parseInt(e.target.value) || 0,
                  })
                }
                className="w-20"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SortableSetItem;
