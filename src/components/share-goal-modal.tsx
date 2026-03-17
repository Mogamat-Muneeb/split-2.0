import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import supabase from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goal: any;
  onClose: () => void;
};

const ShareGoalModal = ({ goal, onClose }: Props) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setError(null);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (userError || !user) {
      setError("User not found");
      setLoading(false);
      return;
    }

    const { error: shareError } = await supabase.from("goal_members").insert({
      goal_id: goal.id,
      user_id: user.id,
      role,
    });

    if (shareError) {
      setError(shareError.message);
      setLoading(false);
      return;
    }

    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center dark:bg-black/20 bg-white/20  p-4 "
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="dark:bg-[#1a1a1b] bg-white shadow w-full max-w-md rounded-xl p-4 "
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <motion.h2
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-semibold text-sm"
            >
              Share goal
            </motion.h2>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
            >
              <X size={16} />
            </motion.button>
          </div>

          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
            >
              <motion.input
                whileFocus={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-full rounded-lg dark:bg-[#1a1a1b] bg-white shadow px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#58A942]/50"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </motion.div>

            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
            >
              <Select
                value={role}
                onValueChange={(value: "editor" | "viewer") => setRole(value)}
              >
                <SelectTrigger className="w-full dark:bg-[#1a1a1b] bg-white shadow border-0 focus:ring-2 focus:ring-[#58A942]/50 text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#1a1a1b] bg-white shadow border-[#3a3a3b] text-white">
                  <SelectGroup>
                    <SelectItem
                      value="editor"
                      className="focus:bg-[#3a3a3b] focus:text-white"
                    >
                      Editor (can edit)
                    </SelectItem>
                    <SelectItem
                      value="viewer"
                      className="focus:bg-[#3a3a3b] focus:text-white"
                    >
                      Viewer (read only)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </motion.div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-red-400 overflow-hidden"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: { y: 0, opacity: 1 },
              }}
            >
              <motion.button
                disabled={loading}
                onClick={handleShare}
                whileHover={{ scale: 1.02, backgroundColor: "#6BC14F" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-full bg-[#58A942] text-black rounded-lg py-2 text-sm font-medium disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                    />
                    Sharing...
                  </motion.div>
                ) : (
                  "Share"
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareGoalModal;
