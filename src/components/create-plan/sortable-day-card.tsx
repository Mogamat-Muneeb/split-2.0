import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/utils";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import type { Day } from "./types";

type SortableDayCardProps = {
  day: Day;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onWeekdayChange: (value: string) => void;
};

export function SortableDayCard({
  day,
  index,
  isActive,
  onSelect,
  onWeekdayChange,
}: SortableDayCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      onClick={onSelect}
      className={`p-3 rounded-xl cursor-pointer ${
        isActive
          ? "bg-orange-600 text-white"
          : "bg-gray-100 dark:bg-neutral-800"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...listeners}
          className="cursor-grab active:cursor-grabbing shrink-0 touch-none p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          onClick={(e) => e.stopPropagation()}
          aria-label="Reorder day"
        >
          <GripVertical size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{`Day ${index + 1}`}</p>
          <div
            className="mt-2"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={day.weekday || "none"}
              onValueChange={onWeekdayChange}
            >
              <SelectTrigger
                className={`h-8 text-xs w-full ${
                  isActive
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white dark:bg-neutral-700"
                }`}
              >
                <SelectValue placeholder="Day of week" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Day of week</SelectLabel>
                  <SelectItem value="none">Not set</SelectItem>
                  {WEEKDAYS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

