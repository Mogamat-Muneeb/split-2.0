/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useGoal } from "@/provider/GoalContext";
import supabase from "@/lib/supabase";
import { GripVertical, ImagePlus, Plus, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/auth/useAuth";

interface SortableStepProps {
  step: { id: string; title: string };
  onEdit: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  editingStepId: string | null;
  editingStepValue: string;
  setEditingStepValue: (value: string) => void;
  saveStepEdit: (stepId: string) => void;
}

function SortableStep({
  step,
  onEdit,
  onDelete,
  editingStepId,
  editingStepValue,
  setEditingStepValue,
  saveStepEdit,
}: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between py-1 text-sm gap-2 ${isDragging ? "z-50" : ""}`}
    >
      <div
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} className="text-muted-foreground" />
      </div>

      {editingStepId === step.id ? (
        <Input
          autoFocus
          value={editingStepValue}
          onChange={(e) => setEditingStepValue(e.target.value)}
          onBlur={() => saveStepEdit(step.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveStepEdit(step.id);
            if (e.key === "Escape") {
              onEdit("");
              setEditingStepValue("");
            }
          }}
          className="h-8 flex-1"
        />
      ) : (
        <span className="cursor-text flex-1" onClick={() => onEdit(step.id)}>
          {step.title}
        </span>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="dark:bg-input/30 bg-transparent hover:bg-input/50"
        onClick={() => onDelete(step.id)}
      >
        <X color="white" size={18} />
      </Button>
    </li>
  );
}

export function GoalModal() {
  const { isGoalModalOpen, closeGoalModal, editingGoal } = useGoal();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingGoal?.image_url) {
      setImagePreview(editingGoal.image_url);
      setRemoveImage(false);
    }
  }, [editingGoal]);

  const [deadlineType, setDeadlineType] = useState<
    "date" | "daily" | "every_n_days"
  >("date");

  const [deadlineDate, setDeadlineDate] = useState<string>("");
  const [intervalDays, setIntervalDays] = useState<number>(3);

  const [steps, setSteps] = useState<{ id: string; title: string }[]>([]);

  const [stepInput, setStepInput] = useState("");

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepValue, setEditingStepValue] = useState("");
  const [notes, setNotes] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description ?? "");
      setDeadlineType(editingGoal.deadline_type ?? "date");
      setDeadlineDate(editingGoal.deadline_date ?? "");
      setIntervalDays(editingGoal.deadline_interval ?? 3);
    }
  }, [editingGoal]);

  useEffect(() => {
    if (editingGoal?.steps) {
      setSteps(editingGoal.steps);
    } else {
      setSteps([]);
    }
  }, [editingGoal]);

  useEffect(() => {
    if (editingGoal?.notes?.length) {
      setNotes(editingGoal.notes[0].content);
    } else {
      setNotes("");
    }
  }, [editingGoal]);

  const upsertNote = async (goalId: string) => {
    if (!notes.trim()) return;

    const { data: existingNote, error } = await supabase
      .from("goal_notes")
      .select("id")
      .eq("goal_id", goalId)
      .eq("user_id", user?.id)
      .maybeSingle();

    if (error) throw error;

    if (existingNote) {
      await supabase
        .from("goal_notes")
        .update({
          content: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingNote.id);
    } else {
      await supabase.from("goal_notes").insert({
        goal_id: goalId,
        user_id: user?.id,
        content: notes,
      });
    }
  };

  const handleImageUpload = async (goalId: string) => {
    if (!imageFile || !user) return null;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${goalId}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Delete old image if it exists
    if (editingGoal?.image_url) {
      try {
        const oldFileName = editingGoal.image_url.split("/").pop();
        if (oldFileName) {
          const oldFilePath = `${user.id}/${oldFileName}`;
          await supabase.storage.from("goal-images").remove([oldFilePath]);
        }
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }

    // Upload new image
    const { error: uploadError } = await supabase.storage
      .from("goal-images")
      .upload(filePath, imageFile, {
        upsert: true,
        contentType: imageFile.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("goal-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleRemoveImage = async (goalId: string) => {
    if (!user || !editingGoal?.image_url) return;

    try {
      const oldFileName = editingGoal.image_url.split("/").pop();
      if (oldFileName) {
        const filePath = `${user.id}/${oldFileName}`;
        await supabase.storage.from("goal-images").remove([filePath]);
      }

      await supabase.from("goals").update({ image_url: null }).eq("id", goalId);

      setImagePreview(null);
      setImageFile(null);
      setRemoveImage(false);
    } catch (error) {
      console.error("Error removing image:", error);
    }
  };

  const saveGoal = async () => {
    if (!user) return;

    let goalId = editingGoal?.id;

    const payload = {
      title,
      description,
      deadline_type: deadlineType,
      deadline_date: deadlineType === "date" ? deadlineDate : null,
      deadline_interval: deadlineType === "every_n_days" ? intervalDays : null,
    };

    try {
      if (editingGoal && goalId) {
        // Update goal
        const { error: goalError } = await supabase
          .from("goals")
          .update(payload)
          .eq("id", goalId);

        if (goalError) throw goalError;

        // Handle image
        if (removeImage) {
          await handleRemoveImage(goalId);
        } else if (imageFile) {
          const imageUrl = await handleImageUpload(goalId);
          if (imageUrl) {
            await supabase
              .from("goals")
              .update({ image_url: imageUrl })
              .eq("id", goalId);
          }
        }

        // Handle steps
        const { data: existingSteps, error: fetchError } = await supabase
          .from("goal_steps")
          .select("id")
          .eq("goal_id", goalId);

        if (fetchError) throw fetchError;

        const stepsToDelete = existingSteps.filter(
          (existingStep) => !steps.find((step) => step.id === existingStep.id),
        );

        if (stepsToDelete.length) {
          await supabase
            .from("goal_steps")
            .delete()
            .in(
              "id",
              stepsToDelete.map((s) => s.id),
            );
        }

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const exists = existingSteps.find((s) => s.id === step.id);

          if (exists) {
            await supabase
              .from("goal_steps")
              .update({ title: step.title, position: i })
              .eq("id", step.id);
          } else {
            await supabase.from("goal_steps").insert({
              goal_id: goalId,
              title: step.title,
              position: i,
            });
          }
        }

        await upsertNote(goalId);
      } else {
        // Create new goal
        const { data, error } = await supabase
          .from("goals")
          .insert({
            user_id: user.id,
            ...payload,
          })
          .select("id")
          .single();

        if (error) throw error;
        goalId = data.id;

        //@ts-ignore

        await upsertNote(goalId);

        // Handle image for new goal
        if (imageFile) {
          //@ts-ignore
          const imageUrl = await handleImageUpload(goalId);
          if (imageUrl) {
            await supabase
              .from("goals")
              .update({ image_url: imageUrl })
              .eq("id", goalId);
          }
        }

        // Insert steps for new goal
        if (steps.length) {
          await supabase.from("goal_steps").insert(
            steps.map((step, index) => ({
              goal_id: goalId,
              title: step.title,
              position: index,
            })),
          );
        }
      }

      closeGoalModal();
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  const saveStepEdit = (stepId: string) => {
    if (!editingStepValue.trim()) return;

    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, title: editingStepValue } : step,
      ),
    );

    setEditingStepId(null);
    setEditingStepValue("");
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isGoalModalOpen) {
        closeGoalModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isGoalModalOpen, closeGoalModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingStepId) return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();

        const stepIds = steps.map((step) => step.id);
        const currentIndex = stepIds.indexOf(editingStepId || "");

        if (currentIndex !== -1) {
          let newIndex;
          if (e.key === "ArrowUp" && currentIndex > 0) {
            newIndex = currentIndex - 1;
          } else if (e.key === "ArrowDown" && currentIndex < steps.length - 1) {
            newIndex = currentIndex + 1;
          } else {
            return;
          }

          const newSteps = arrayMove(steps, currentIndex, newIndex);
          setSteps(newSteps);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [steps, editingStepId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isGoalModalOpen) {
        closeGoalModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isGoalModalOpen, closeGoalModal]);

  useEffect(() => {
    if (isGoalModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isGoalModalOpen]);

  const isSaveDisabled = () => {
    if (!title.trim()) return true;
    // if (!description.trim()) return true;
    if (steps.length === 0) return true;
    if (deadlineType === "date") {
      return !deadlineDate.trim();
    } else if (deadlineType === "every_n_days") {
      return !intervalDays || intervalDays < 1;
    }
    return false;
  };

  const deleteStep = (stepId: string) => {
    setSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  return (
    <AnimatePresence>
      {isGoalModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 dark:bg-black/20 bg-white/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeGoalModal}
          />

          {/* Modal */}
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center lg:p-4 p-2 h-fit"
            onClick={closeGoalModal}
          >
            <motion.div
              className="relative w-full lg:w-170 rounded-xl dark:bg-[#1a1a1b] bg-white shadow h-full max-h-dvh overflow-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lg:p-6 p-3 w-full h-full">
                <div className="sticky z-10 flex items-center dark:bg-[#1a1a1b] bg-white  top-0 h-[60px]">
                  <h2 className="text-lg font-bold leading-none tracking-tight">
                    {editingGoal ? "Edit Goal" : "New Goal"}
                  </h2>
                </div>

                <div className="space-y-4 flex flex-col h-full justify-between">
                  <div className="flex flex-col h-full pt-3">
                    <motion.input
                      whileFocus={{ scale: 1.02 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      className="w-full rounded-lg dark:bg-[#1a1a1b] bg-white shadow px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#58A942]/50"
                      placeholder="Goal title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />

                    <Textarea
                      placeholder="Description.."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-32 dark:bg-[#1a1a1b] bg-white shadow border-0 focus:ring-2 focus:ring-[#58A942]/50 mt-2"
                    />

                    {imagePreview && (
                      <div className="relative mt-2">
                        <img
                          src={imagePreview}
                          alt="Goal"
                          className="w-full max-h-60 object-cover rounded-lg"
                        />

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            setRemoveImage(true);
                          }}
                        >
                          <X size={16} />
                        </motion.button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 h-full flex flex-col justify-end">
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Deadline</p>

                      <div className="flex gap-2">
                        <Button
                          className="cursor-pointer"
                          variant={
                            deadlineType === "date" ? "default" : "outline"
                          }
                          onClick={() => setDeadlineType("date")}
                        >
                          Date
                        </Button>

                        <Button
                          className="cursor-pointer"
                          variant={
                            deadlineType === "daily" ? "default" : "outline"
                          }
                          onClick={() => setDeadlineType("daily")}
                        >
                          Every day
                        </Button>

                        <Button
                          className="cursor-pointer"
                          variant={
                            deadlineType === "every_n_days"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setDeadlineType("every_n_days")}
                        >
                          Every X days
                        </Button>
                      </div>

                      {deadlineType === "date" && (
                        <Input
                          type="date"
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                        />
                      )}

                      {deadlineType === "every_n_days" && (
                        <motion.input
                          whileFocus={{ scale: 1.02 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                          className="w-full rounded-lg dark:bg-[#1a1a1b] bg-white shadow px-3 py-2 text-sm outline-none focus:!ring-2 focus:!ring-[#58A942]/50"
                          type="number"
                          min={1}
                          placeholder="Every how many days?"
                          value={intervalDays}
                          onChange={(e) =>
                            setIntervalDays(Number(e.target.value))
                          }
                        />
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Steps</p>

                      <div className="flex gap-2">
                        <motion.input
                          whileFocus={{ scale: 1.02 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                          className="w-full rounded-lg dark:bg-[#1a1a1b] bg-white shadow px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#58A942]/50"
                          placeholder="Add a step"
                          value={stepInput}
                          onChange={(e) => setStepInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && stepInput.trim()) {
                              setSteps((prev) => [
                                ...prev,
                                { id: crypto.randomUUID(), title: stepInput },
                              ]);
                              setStepInput("");
                            }
                          }}
                        />

                        <Button
                          type="button"
                          onClick={() => {
                            if (!stepInput.trim()) return;
                            setSteps((prev) => [
                              ...prev,
                              { id: crypto.randomUUID(), title: stepInput },
                            ]);
                            setStepInput("");
                          }}
                          className="bg-[#58a9421a] text-[#58A942] cursor-pointer"
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Plus size={18} />
                          </motion.button>
                        </Button>
                      </div>

                      {steps.length > 0 && (
                        <div className="rounded-md border border-input/20 p-2">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={steps.map((step) => step.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <ul className="space-y-1">
                                {steps.map((step) => (
                                  <SortableStep
                                    key={step.id}
                                    step={step}
                                    onEdit={setEditingStepId}
                                    onDelete={deleteStep}
                                    editingStepId={editingStepId}
                                    editingStepValue={editingStepValue}
                                    setEditingStepValue={setEditingStepValue}
                                    saveStepEdit={saveStepEdit}
                                  />
                                ))}
                              </ul>
                            </SortableContext>
                          </DndContext>

                          {steps.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              Drag steps to reorder • Use arrow keys for
                              keyboard navigation
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Notes</p>

                        <Textarea
                          placeholder="Write notes for this goal…"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="min-h-32 dark:bg-[#1a1a1b] bg-white shadow border-0 focus:ring-2 focus:ring-[#58A942]/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full">
                      <div className="group">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                            setRemoveImage(false);
                          }}
                          accept="image/*"
                          className="hidden"
                        />

                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          className="dark:bg-input/30 bg-transparent cursor-pointer group-hover:translate-1 group-hover:transform-all group-hover:duration-200"
                        >
                          <ImagePlus size={18} color="white" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          onClick={closeGoalModal}
                          className="dark:bg-input/30 bg-transparent cursor-pointer"
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X color="white" size={18} />
                          </motion.button>
                        </Button>

                        <motion.button
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Button
                            onClick={saveGoal}
                            className={`${isSaveDisabled() ? "opacity-50 cursor-not-allowed" : ""} bg-[#58a9421a] text-[#58A942] cursor-pointer`}
                            disabled={isSaveDisabled()}
                          >
                            {editingGoal ? "Update" : "Create"}
                          </Button>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
