import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { Goal, Tag } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/useAuth";
import { Settings } from "lucide-react";
import EditTagModal from "./edit-tag-modal";

interface Props {
  goal: Goal;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TagAttachModal({
  goal,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null); // State for edit modal
  const { user } = useAuth();

  // List of protected tags that cannot be edited
  const PROTECTED_TAGS = ["Important", "Review", "Urgent"];

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setFetching(true);

        await Promise.all([fetchTags(), fetchGoalTags()]);
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, [open, goal]);

  const fetchTags = async () => {
    const { data } = await supabase.from("tags").select("*").order("name");

    setTags(data || []);
  };

  const fetchGoalTags = async () => {
    const { data } = await supabase
      .from("goal_tags")
      .select("tag_id")
      .eq("goal_id", goal.id)
      .eq("user_id", user?.id);

    setSelectedTags(new Set((data || []).map((t) => t.tag_id)));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const saveTags = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { error: deleteError } = await supabase
        .from("goal_tags")
        .delete()
        .eq("goal_id", goal.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      if (selectedTags.size > 0) {
        const inserts = Array.from(selectedTags).map((tagId) => ({
          goal_id: goal.id,
          tag_id: tagId,
          user_id: user.id,
        }));

        const { error: insertError } = await supabase
          .from("goal_tags")
          .insert(inserts);

        if (insertError) throw insertError;
      }

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (err) {
      console.error("Error saving tags:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTag = (tag: Tag, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick

    // Check if tag is protected
    if (PROTECTED_TAGS.includes(tag.name)) {
      return; // Don't open edit modal for protected tags
    }

    setEditingTag(tag);
  };

  const handleTagUpdated = async () => {
    // Refresh tags after edit
    await fetchTags();
    setEditingTag(null);
  };

  // Check if a tag is protected
  const isProtectedTag = (tagName: string) => {
    return PROTECTED_TAGS.includes(tagName);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/20 shadow z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
            >
              <motion.div
                className="bg-[#1a1a1b] w-full max-w-md rounded-xl p-4 space-y-4 pointer-events-auto shadow-xl border border-[#2a2a2b]"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm font-semibold text-gray-200"
                >
                  Attach Tags to "{goal.title}"
                </motion.h3>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {fetching ? (
                    <div className="flex justify-center items-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full"
                      />
                    </div>
                  ) : tags.length === 0 ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-gray-500 py-4"
                    >
                      No tags available
                    </motion.p>
                  ) : (
                    <AnimatePresence>
                      {tags.map((tag, index) => {
                        const isProtected = isProtectedTag(tag.name);

                        return (
                          <motion.div
                            key={tag.id ?? `tag-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{
                              scale: 1.02,
                              backgroundColor: "#2a2a2b",
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer group ${
                              isProtected ? "opacity-90" : ""
                            }`}
                            onClick={() => toggleTag(tag.id)}
                          >
                            <motion.div
                              whileTap={{ scale: 0.8 }}
                              whileHover={{ scale: 1.1 }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.has(tag.id)}
                                onChange={() => {}}
                                className="accent-[#58A942] cursor-pointer w-4 h-4"
                              />
                            </motion.div>

                            <span className="text-sm text-gray-300 flex-1">
                              {tag.name}
                            </span>

                            <AnimatePresence>
                              {selectedTags.has(tag.id) && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="w-2 h-2 rounded-full bg-[#58A942]"
                                />
                              )}
                            </AnimatePresence>

                            {/* Settings icon - only show for non-protected tags */}
                            {!isProtected && (
                              <motion.div
                                whileTap={{ scale: 0.8 }}
                                whileHover={{ scale: 1.1 }}
                                className="md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                onClick={(e) => handleEditTag(tag, e)}
                                title="Edit tag"
                              >
                                <Settings className="stroke-gray-100/30 w-4 hover:stroke-gray-100/60 transition-colors" />
                              </motion.div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>

                <motion.div
                  className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2b]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                      className="border-[#2a2a2b] hover:bg-[#2a2a2b]"
                    >
                      Cancel
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={saveTags}
                      disabled={loading}
                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full mr-2"
                        />
                      ) : null}
                      {loading ? "Saving..." : "Save Tags"}
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Tag Modal - only shown for non-protected tags */}
      <EditTagModal
        tag={editingTag}
        open={!!editingTag}
        onClose={() => setEditingTag(null)}
        onSuccess={handleTagUpdated}
      />
    </>
  );
}
