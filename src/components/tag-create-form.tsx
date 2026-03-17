import { useState } from "react";
import supabase from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TagCreateForm({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createTag = async () => {
    if (!name.trim() || !user) return;

    try {
      setLoading(true);

      await supabase.from("tags").insert({
        name: name.trim(),
        created_by: user.id,
        is_system: false,
      });

      setName("");
      onSuccess?.();
      
      // Close modal after successful creation
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <motion.div 
              className="bg-[#1a1a1b] w-full max-w-md rounded-xl p-5 space-y-4 pointer-events-auto shadow-xl border border-[#2a2a2b]"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center justify-between"
              >
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    🏷️
                  </motion.span>
                  Create New Tag
                </h3>

                <motion.button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200 text-lg"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  ✕
                </motion.button>
              </motion.div>

              {/* Form Content */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                {/* Input field with clear button */}
                <div className="relative">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter tag name..."
                    className="text-sm bg-[#2a2a2b] border-[#3a3a3b] focus:border-green-500/50 pr-8"
                    disabled={loading}
                    autoFocus
                  />
                  
                  <AnimatePresence>
                    {name && (
                      <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setName("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        ✕
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tag preview */}
                <AnimatePresence>
                  {name && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="pt-2 border-t border-[#2a2a2b]"
                    >
                      <p className="text-xs text-gray-400 mb-2">Preview:</p>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2a2a2b] rounded-lg border border-[#3a3a3b]"
                      >
                        <span className="text-green-400">#</span>
                        <span className="text-sm text-gray-300">{name}</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Character count */}
                <AnimatePresence>
                  {name.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="text-xs text-gray-500"
                    >
                      {name.length}/20 characters
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Footer Buttons */}
              <motion.div 
                className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2b]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
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
                    onClick={createTag}
                    disabled={loading || !name.trim()}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 min-w-[100px]"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full"
                      />
                    ) : (
                      "Create Tag"
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}