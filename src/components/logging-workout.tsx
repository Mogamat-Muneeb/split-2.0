import type { ActiveWorkout } from "@/lib/types";
import { useLogWorkout } from "@/provider/LogWorkoutProvider";
import { Check } from "lucide-react";
import React from "react";

interface LoggingWorkoutProps {
  activeWorkout: ActiveWorkout;
}

const LoggingWorkout: React.FC<LoggingWorkoutProps> = ({ activeWorkout }) => {
  const { updateSet } = useLogWorkout();
  return (
    <div className="space-y-6 p-4">
      {activeWorkout.exercises.map((exercise, exIndex) => (
        <div key={exercise.id} className=" bg-accent rounded-lg p-4">
          <h3 className="font-medium my-4">
            {exIndex + 1}. {exercise.name}
          </h3>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-5 items-center w-full mb-4 text-sm font-medium">
              <div>SET</div>
              <div className="flex items-center justify-center w-full">
                PREV
              </div>
              <div className="flex items-center justify-center w-full ">KG</div>
              <div className=" flex items-center justify-center w-full">
                <p>REPS</p>
              </div>
              <div className="flex items-center justify-end">
                <Check />
              </div>
            </div>

            {exercise.sets.map((set) => (
              <div
                key={set.id}
                className={`grid grid-cols-5 items-center  p-2 rounded-lg shadow-sm ${set.checked ? "dark:bg-[#33658a] bg-[#86bbd8]" :"bg-background"}`}
              >
                <div>{set.set_number}</div>

                <div className="flex  items-center justify-center w-full">
                  -
                </div>

                <div className="flex  items-center justify-center w-full">
                  {set.weight} kg
                </div>

                <div className="flex  items-center justify-center w-full">
                  {set.reps !== null
                    ? `${set.reps} `
                    : ` ${set.rep_range_min}-${set.rep_range_max}`}
                </div>

                <div className="flex justify-end">
                  <input
                    className='accent-orange-700'
                    type="checkbox"
                    checked={set.checked || false}
                    onChange={() =>
                      updateSet(exercise.id, set.id, {
                        checked: !set.checked,
                      })
                    }
                  />
                </div>
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
