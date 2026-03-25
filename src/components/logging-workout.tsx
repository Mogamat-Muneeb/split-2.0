import type { ActiveWorkout } from "@/lib/types";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import React from "react";

interface LoggingWorkoutProps {
  activeWorkout: ActiveWorkout;
}

const LoggingWorkout: React.FC<LoggingWorkoutProps> = ({ activeWorkout }) => {
  console.log("🚀 ~ LoggingWorkout ~ activeWorkout:", activeWorkout)
  const { updateSet } = useLogWorkout();
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-lg font-bold text-gray-700">
        Continuing: {activeWorkout.name}
      </h2>

      {activeWorkout.exercises.map((exercise, exIndex) => (
        <div key={exercise.id} className="border rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">
            {exIndex + 1}. {exercise.name}
          </h3>

          <div className="space-y-2">
            {exercise.sets.map((set, setIndex) => (
              <div
                key={set.id}
                className="flex justify-between items-center p-2 rounded shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={set.checked || false}
                    onChange={() =>
                      updateSet(exercise.id, set.id, {
                        checked: !set.checked,
                      })
                    }
                  />

                  <span className="font-medium">Set {set.set_number}</span>
                </div>

                <span>
                  {set.reps !== null
                    ? `${set.reps} reps`
                    : `Rep Range: ${set.rep_range_min}-${set.rep_range_max}`}
                </span>

                <span>{set.weight} kg</span>
              </div>
            ))}
          </div>

          {exercise.notes && (
            <p className="mt-2 text-sm text-gray-500">
              Notes: {exercise.notes}
            </p>
          )}

          {exercise.rest_timer && (
            <p className="mt-1 text-sm text-gray-400">
              Rest Timer: {exercise.rest_timer}s
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default LoggingWorkout;
