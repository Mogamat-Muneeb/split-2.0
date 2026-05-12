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
import type { Difficulty, MuscleMixEntry } from "./types";
import { formatEstDuration, formatVolumeKg } from "./utils";

type CreatePlanHeaderProps = {
  splitName: string;
  isActive: boolean;
  difficulty: Difficulty;
  muscleMix: MuscleMixEntry[];
  splitStats: {
    totalVolumeKg: number;
    totalEstSeconds: number;
  };
  onSplitNameChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onDifficultyChange: (value: Difficulty) => void;
  onAddDay: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export function CreatePlanHeader({
  splitName,
  isActive,
  difficulty,
  muscleMix,
  splitStats,
  onSplitNameChange,
  onActiveChange,
  onDifficultyChange,
  onAddDay,
  onSave,
  onCancel,
}: CreatePlanHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-4 bg-accent rounded-2xl  p-4">
      <div className="flex lg:flex-row flex-col-reverse items-center gap-2 ">
        <div className="flex items-center gap-2 w-full">
          <div className="lg:min-w-[200px]  flex-1">
            <Input
              placeholder="Split name..."
              className="w-full max-w-md "
              value={splitName}
              onChange={(e) => onSplitNameChange(e.target.value)}
            />
          </div>
          <div className="flex lg:hidden">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => onActiveChange(e.target.checked)}
              className="w-4 h-4 rounded  accent-orange-700"
            />
            <label
              htmlFor="isActive"
              className="text-xs font-medium text-muted-foreground lg:block hidden"
            >
              Set as active split
            </label>
          </div>
        </div>

        <div className=" flex gap-2 lg:flex-row flex-col justify-end w-full">
          <div>
            <div className=" items-center gap-2 lg:flex hidden">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => onActiveChange(e.target.checked)}
                className="w-4 h-4 rounded  accent-orange-700"
              />
              <label
                htmlFor="isActive"
                className="text-xs font-medium text-muted-foreground lg:block hidden"
              >
                Set as active split
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 lg:block hidden">
              Only one split can be active at a time
            </p>
          </div>
          <div className="flex gap-2 items-center  justify-end">
            <Button onClick={onAddDay}>+ Day</Button>
            <Button
              onClick={onSave}
              className="hover:bg-orange-700 bg-orange-600 text-foreground"
            >
              Save
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="!border-transparent"
            >
              {" "}
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {muscleMix.length > 0 && (
        <div className="flex w-full flex-wrap gap-x-8 gap-y-3 border-b border-border/60 pb-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Est. time
            </p>
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {formatEstDuration(splitStats.totalEstSeconds)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Sum of all days (work + rests + changeovers)
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Total volume
            </p>
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {formatVolumeKg(splitStats.totalVolumeKg)}
              <span className="text-sm font-medium text-muted-foreground">
                {" "}
                kg·reps
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Σ (weight × reps) across every set
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Difficulty
            </p>
            <Select value={difficulty} onValueChange={onDifficultyChange}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-neutral-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Training Difficulty</SelectLabel>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Overall program intensity
            </p>
          </div>
        </div>
      )}

      {muscleMix.length > 0 ? (
        <div className="w-full space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Muscle focus (all days)
          </p>
          <div
            className="flex h-3 w-full gap-2 overflow-hidden rounded-full"
            role="img"
            aria-label="Muscle group distribution for this split"
          >
            {muscleMix.map((m) => (
              <div
                key={m.muscle}
                className="h-full min-w-0 transition-[width] duration-300 rounded-2xl"
                style={{
                  width: `${m.percent}%`,
                  backgroundColor: m.color,
                }}
                title={`${m.muscle}: ${m.percent}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {muscleMix.map((m) => (
              <span
                key={m.muscle}
                className="inline-flex items-center gap-1.5 capitalize"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full "
                  style={{ backgroundColor: m.color }}
                  aria-hidden
                />
                <span className="font-medium">{m.muscle}</span>
                <span className="tabular-nums text-muted-foreground">
                  {m.percent}%
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add exercises to see muscle balance across your split.
        </p>
      )}
    </div>
  );
}

