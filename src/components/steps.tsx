import type { Goal } from "@/lib/types";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/useAuth";
import { useTheme } from "next-themes";

interface StepsProps {
  openStepsGoalId: number | null;
  goal: Goal;
  toggleStepCompletion: (stepId: number, completed: boolean) => Promise<void>;
}

const Steps: React.FC<StepsProps> = ({
  openStepsGoalId,
  goal,
  toggleStepCompletion,
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const isViewer =
    goal.goal_members?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (member: any) => member.user_id === user?.id,
    )?.role === "viewer";

  return (
    <motion.div
      initial={false}
      animate={{
        height: String(openStepsGoalId) === goal.id ? "auto" : 0,
        opacity: String(openStepsGoalId) === goal.id ? 1 : 0,
      }}
      transition={{
        height: { duration: 0.3, ease: "easeInOut" },
        opacity: {
          duration: 0.2,
          delay: String(openStepsGoalId) === goal.id ? 0.1 : 0,
        },
      }}
      className="overflow-hidden"
    >
      <motion.div
        className="space-y-2 mt-3 px-1"
        initial="hidden"
        animate={String(openStepsGoalId) === goal.id ? "visible" : "hidden"}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.07,
              delayChildren: 0.1,
            },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {goal?.steps?.map(
            (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              step: any,
            ) => (
              <motion.div
                key={step.id}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 20,
                    scale: 0.95,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      damping: 10,
                      stiffness: 200,
                    },
                  },
                  exit: {
                    opacity: 0,
                    y: -20,
                    scale: 0.95,
                    transition: {
                      duration: 0.2,
                    },
                  },
                }}
                whileHover={{
                  scale: isViewer ? 1 : 1.02,
                  backgroundColor: isViewer
                    ? "#2a2a2b"
                    : `${isDark ? "#333334" : "#ffff"}`,
                  transition: { duration: 0.2 },
                }}
                className={`flex items-center justify-between rounded-lg p-2 dark:bg-[#1a1a1b] bg-white shadow  ${
                  isViewer ? "opacity-90" : ""
                }`}
              >
                <label className="flex items-center gap-2 text-sm flex-1">
                  <motion.input
                    type="checkbox"
                    checked={step.is_completed}
                    onChange={() =>
                      !isViewer &&
                      toggleStepCompletion(step.id, !step.is_completed)
                    }
                    disabled={isViewer}
                    className={`accent-[#58A942] ${isViewer ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    whileTap={!isViewer ? { scale: 0.1 } : {}}
                    transition={{ duration: 0.1 }}
                  />
                  <motion.span
                    animate={{
                      textDecoration: step.is_completed
                        ? "line-through"
                        : "none",
                      color: step.is_completed ? "#6b7280" : "inherit",
                    }}
                    transition={{ duration: 0.2 }}
                    className={`transition-colors ${isViewer ? "select-none" : ""}`}
                  >
                    {step.title}
                  </motion.span>
                </label>
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default Steps;
