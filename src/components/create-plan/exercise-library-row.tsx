import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/types";
import { DraggableExercise } from "./draggable-exercise";
import {
  getColorForMuscle,
  getExercisePrimaryMuscleKeys,
} from "./utils";

type ExerciseLibraryRowProps = {
  exercise: Exercise;
  onAdd: (exercise: Exercise) => void;
};

export function ExerciseLibraryRow({
  exercise,
  onAdd,
}: ExerciseLibraryRowProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg">
      <DraggableExercise
        id={`library-${exercise.folder}`}
        name={exercise.jsonContents?.[0]?.content?.name}
        image={exercise.images[0]}
        accentColor={getColorForMuscle(
          getExercisePrimaryMuscleKeys(exercise)[0],
        )}
        pmuscle={
          exercise.jsonContents?.[0]?.content.primaryMuscles?.join(", ") ||
          "N/A"
        }
      />

      <Button
        onClick={() => onAdd(exercise)}
        className="ml-2 shrink-0 text-xs bg-orange-600 text-white hover:bg-orange-700"
      >
        +
      </Button>
    </div>
  );
}

