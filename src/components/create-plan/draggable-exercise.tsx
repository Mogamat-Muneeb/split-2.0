import { useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";

type DraggableExerciseProps = {
  id: string;
  name: string;
  image?: string;
  accentColor: string;
  pmuscle: string;
};

export function DraggableExercise({
  id,
  name,
  image,
  accentColor,
  pmuscle,
}: DraggableExerciseProps) {
  const { attributes, listeners, setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="flex items-center justify-center w-full"
      >
        <div className="shrink-0 ml-2">
          {image && (
            <img
              src={image}
              alt={name}
              className="w-12 h-12 rounded-full object-cover grayscale-100"
            />
          )}
        </div>

        <div className="flex items-center justify-between w-full ml-3">
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h4 className="text-[14px] font-medium">{name}</h4>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              <span
                className="font-medium text-[10px] rounded uppercase"
                style={{ color: accentColor }}
              >
                {pmuscle}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

