import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type MobileExerciseLibrarySheetProps = {
  open: boolean;
  searchTerm: string;
  children: ReactNode;
  onSearchTermChange: (value: string) => void;
  onClose: () => void;
};

export function MobileExerciseLibrarySheet({
  open,
  searchTerm,
  children,
  onSearchTermChange,
  onClose,
}: MobileExerciseLibrarySheetProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="mobile-lib-backdrop"
            aria-label="Close exercise library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-55 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            key="mobile-lib-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-exercise-library-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 360 }}
            className="fixed inset-x-0 bottom-0 z-56 flex max-h-[min(88dvh,640px)] flex-col rounded-t-2xl bg-accent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-[#2d2d2d] md:hidden"
          >
            <div className="mb-3 flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={onClose}
                aria-label="Close"
              >
                <ArrowLeft size={20} />
              </Button>
              <h2
                id="mobile-exercise-library-title"
                className="text-base font-semibold tracking-tight"
              >
                Exercise library
              </h2>
            </div>
            <Input
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="shrink-0"
            />
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

