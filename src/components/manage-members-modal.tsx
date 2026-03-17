// components/manage-members-modal.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Trash2, Send } from "lucide-react";
import supabase from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Goal } from "@/lib/types";

interface ManageMembersModalProps {
  goal: Goal;
  onClose: () => void;
}

const ManageMembersModal = ({ goal, onClose }: ManageMembersModalProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState(goal.goal_members || []);

  const addMember = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("id, email, avatar_url")
        .eq("email", email)
        .single();

      if (!userData) {
        alert("User not found");
        return;
      }

      const { data: newMember } = await supabase
        .from("goal_members")
        .insert({
          goal_id: goal.id,
          user_id: userData.id,
          role: role,
        })
        .select(
          `
          *,
          users (
            email,
            avatar_url
          )
        `,
        )
        .single();

      if (newMember) {
        setMembers([...members, newMember]);
      }

      setEmail("");
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("goal_members").delete().eq("id", memberId);
    setMembers(members.filter((m: { id: string }) => m.id !== memberId));
  };

  const updateRole = async (memberId: string, newRole: "editor" | "viewer") => {
    await supabase
      .from("goal_members")
      .update({ role: newRole })
      .eq("id", memberId);

    setMembers(
      members.map((m: { id: string }) =>
        m.id === memberId ? { ...m, role: newRole } : m,
      ),
    );
  };

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: -20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      x: 20,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
    tap: {
      scale: 0.95,
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0  p-4  dark:bg-black/20 bg-white/20 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-[#1a1a1b] rounded-xl p-4 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="flex items-center justify-between mb-4"
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            variants={itemVariants}
          >
            <h3 className="text-sm font-medium">Manage Members</h3>
            <motion.button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-ignore
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <X size={16} />
            </motion.button>
          </motion.div>

          {/* Add member form */}
          <motion.div
            className="flex gap-2 mb-4"
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            variants={itemVariants}
          >
            <motion.input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 dark:bg-[#1a1a1b] bg-white shadowrounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#58A942]/50 w-full"
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />

            {/* Custom Select for role */}
            <Select
              value={role}
              onValueChange={(value: "editor" | "viewer") => setRole(value)}
            >
              <SelectTrigger className="w-[110px] dark:bg-[#1a1a1b] bg-white shadow border-0 focus:ring-2 focus:ring-[#58A942]/50 text-xs h-auto py-1.5">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#1a1a1b] bg-white shadow border-[#3a3a3b] text-white">
                <SelectGroup>
                  <SelectItem
                    value="editor"
                    className="focus:bg-[#3a3a3b] focus:text-white text-xs"
                  >
                    Editor (can edit)
                  </SelectItem>
                  <SelectItem
                    value="viewer"
                    className="focus:bg-[#3a3a3b] focus:text-white text-xs"
                  >
                    Viewer (read only)
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <motion.button
              onClick={addMember}
              disabled={loading || !email}
              className="bg-blue-500/20 text-blue-400 rounded-lg px-3 py-1.5 text-xs hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-ignore
              variants={buttonVariants}
              whileHover={!loading && email ? "hover" : {}}
              whileTap={!loading && email ? "tap" : {}}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Send size={14} />
                </motion.div>
              ) : (
                <UserPlus size={14} />
              )}
            </motion.button>
          </motion.div>

          {/* Members list */}
          <motion.div
            className="space-y-2 max-h-60 overflow-y-auto"
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            variants={itemVariants}
          >
            <AnimatePresence mode="popLayout">
              {members.map(
                (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  member: any,
                  index: number,
                ) => (
                  <motion.div
                    key={member.id}
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    transition={{
                      layout: {
                        type: "spring",
                        damping: 25,
                        stiffness: 300,
                      },
                    }}
                    className="flex items-center justify-between dark:bg-[#1a1a1b] bg-white shadow rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {member.users?.avatar_url ? (
                        <motion.img
                          src={member.users.avatar_url}
                          alt={member.users.email}
                          className="w-6 h-6 rounded-full"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: "spring",
                            damping: 20,
                            stiffness: 300,
                            delay: index * 0.05,
                          }}
                        />
                      ) : (
                        <motion.div
                          className="w-6 h-6 rounded-full bg-[#3a3a3b] flex items-center justify-center text-xs text-gray-400"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            damping: 20,
                            stiffness: 300,
                            delay: index * 0.05,
                          }}
                        >
                          {member.users?.email?.charAt(0).toUpperCase() || "U"}
                        </motion.div>
                      )}
                      <div>
                        <p className="text-xs text-gray-200">
                          {member.users.full_name === null
                            ? member.users?.email?.split("@")[0]
                            : member.users.full_name}
                        </p>
                        <p className="lg:max-w-full max-w-[120px] text-[10px] text-gray-500 truncate">
                          {member.users?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.role !== "owner" ? (
                        <>
                          {/* Custom Select for member role update */}
                          <Select
                            value={member.role}
                            onValueChange={(value: "editor" | "viewer") =>
                              updateRole(member.id, value)
                            }
                          >
                            <SelectTrigger className="w-[90px] bg-[#3a3a3b] border-0 focus:ring-2 focus:ring-[#58A942]/50 text-[10px] h-auto py-1">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-[#1a1a1b] bg-white shadow border-[#3a3a3b] text-white">
                              <SelectGroup>
                                <SelectItem
                                  value="editor"
                                  className="focus:bg-[#3a3a3b] focus:text-white text-xs"
                                >
                                  Editor
                                </SelectItem>
                                <SelectItem
                                  value="viewer"
                                  className="focus:bg-[#3a3a3b] focus:text-white text-xs"
                                >
                                  Viewer
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>

                          <motion.button
                            onClick={() => removeMember(member.id)}
                            className="text-red-400 hover:text-red-300"
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            //@ts-ignore
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </>
                      ) : (
                        <motion.span
                          className="text-[10px] text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          Owner
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                ),
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ManageMembersModal;
