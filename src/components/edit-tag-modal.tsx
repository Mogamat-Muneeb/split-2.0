// EditTagModal.tsx
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Tag } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/useAuth";
import { X } from "lucide-react";

interface Props {
  tag: Tag | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditTagModal({ tag, open, onClose, onSuccess }: Props) {
  const [name, setName] = useState(tag?.name || "");

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (tag) {
      setName(tag.name);
    }
  }, [tag]);

  const handleUpdate = async () => {
    if (!tag || !user || !name.trim()) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("tags")
        .update({ name: name.trim() })
        .eq("id", tag.id)
        .select();

      if (error) throw error;

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (err) {
      console.error("Error updating tag:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tag || !user) return;

    if (
      !confirm(
        "Are you sure you want to delete this tag? It will be removed from all goals.",
      )
    ) {
      return;
    }

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tag.id)
        .eq("user_id", user.id);

      if (error) throw error;

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (err) {
      console.error("Error deleting tag:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && tag && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[60]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none"
          >
            <motion.div
              className="bg-[#1a1a1b] w-full max-w-md rounded-xl p-4 space-y-4 pointer-events-auto shadow-xl border border-[#2a2a2b]"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    🏷️
                  </motion.span>
                  Edit Tag
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-[#2a2a2b] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter tag name"
                    className="w-full bg-[#2a2a2b] text-gray-200 text-sm rounded-lg px-3 py-2 border border-[#3a3a3b] focus:outline-none focus:border-green-500/50"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2b]">
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={loading || deleting}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>

                  <Button
                    onClick={handleUpdate}
                    disabled={loading || deleting || !name.trim()}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
