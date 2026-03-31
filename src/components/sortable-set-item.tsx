import React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Set } from "@/lib/types";

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

  const backgroundColor = setIndex % 2 === 0 ? "bg-background" : "bg-muted";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex flex-col p-3 ${backgroundColor}`}
    >
      <div className="grid grid-cols-4 px-2 items-center w-full  text-xs tracking-tight gap-2">
        <div className="flex items-center gap-2  justify-start">
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical size={14} />
          </div>
          <div className="w-fit flex flex-col gap-2 font-medium">{setIndex + 1}</div>
        </div>

        <div className=" flex flex-col gap-2 ">
          <Input
            type="number"
            placeholder="0"
            value={set.weight || ""}
            onChange={(e) =>
              updateSet(folder, setIndex, {
                weight: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>

        <div className="flex flex-col gap-2">
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
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end ">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeSet(folder, setIndex)}
            className="p-0"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortableSetItem;
