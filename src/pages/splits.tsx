import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import CreateWorkoutModal from "@/components/create-workout-modal";

const Splits = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div>
      <Button onClick={openModal}>New Workout</Button>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <CreateWorkoutModal closeModal={closeModal} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Splits;
