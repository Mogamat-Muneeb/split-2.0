import { useAuth } from "@/auth/useAuth";
import supabase from "@/lib/supabase";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Upload, Loader2, Edit2, Check } from "lucide-react";

const Header = () => {
  const { user: authUser } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // const [activeTab, setActiveTab] = useState<"profile" | "stats">("profile");

  useEffect(() => {
    if (!authUser?.id) return;

    // Initial fetch
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!error && data) {
        setCurrentUser(data);
        setNewFullName(data.full_name || "");
      }
    };

    fetchUser();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel("user-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${authUser.id}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setCurrentUser(payload.new);
          setNewFullName(payload.new.full_name || "");
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingName]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", authUser?.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCurrentUser((prev: any) => ({
        ...prev,
        avatar_url: publicUrl,
      }));
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error uploading avatar! Please check console for details.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updateFullName = async () => {
    if (!newFullName.trim() || newFullName === currentUser?.full_name) {
      setEditingName(false);
      return;
    }

    try {
      setUpdatingName(true);

      const { error } = await supabase
        .from("users")
        .update({ full_name: newFullName.trim() })
        .eq("id", authUser?.id);

      if (error) {
        console.error("Error updating name:", error);
        alert("Error updating name!");
        return;
      }

      setEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
      alert("Error updating name!");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateFullName();
    } else if (e.key === "Escape") {
      setEditingName(false);
      setNewFullName(currentUser?.full_name || "");
    }
  };

  return (
    <>
      <div className="flex justify-between items-center py-2 sticky z-30 left-4 top-0 right-4 h-[60px] bg-background">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 42 42"
            fill="none"
          >
            <path
              d="M40.6421 18.6841H24.3608C23.898 18.6841 24.0622 19.3363 24.349 19.6996L29.6363 26.3969C29.5485 26.3129 29.6363 26.5153 29.6363 26.3969C29.7204 26.4809 36.3036 26.3893 31.028 26.3969H29.6363C29.2352 29.602 25.6061 32.2226 21.4269 32.2226C14.9824 32.2226 10.9981 26.3014 10.9981 20.8119C10.9981 15.4141 14.8984 9.82912 21.4269 9.82912C23.5283 9.82912 29.6858 9.40706 31.5118 8.36701C33.9942 6.953 36.4913 5.53029 36.4476 5.48948C32.574 1.89859 27.3787 0 21.4269 0C9.01162 0 0 8.75185 0 20.8081C0 32.8681 9.01162 41.62 21.4269 41.62C40.1493 41.62 41.0966 22.8862 41.0966 19.1311C41.0966 18.8866 40.8942 18.6841 40.6421 18.6841Z"
              fill="url(#paint0_linear_628_596)"
            />
            <defs>
              <linearGradient
                id="paint0_linear_628_596"
                x1="20.5483"
                y1="0"
                x2="20.5483"
                y2="41.62"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.230769" stopColor="#40E740" />
                <stop offset="1" stopColor="#246B81" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex items-center gap-4">
          <motion.div
            className="cursor-pointer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsModalOpen(true)}
          >
            {!currentUser?.avatar_url ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={"https://i.postimg.cc/c1t7Yy6p/1.png"}
                  alt="User avatar"
                  className="object-cover rounded-full w-7 h-7 ring-2 ring-transparent hover:ring-[#58A942]/50 transition-all"
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={currentUser.avatar_url}
                  alt="User avatar"
                  className="object-cover rounded-full w-7 h-7 ring-2 ring-transparent hover:ring-[#58A942]/50 transition-all"
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
            >
              <div className="bg-[#1a1a1b]  shadow rounded-xl p-6 ">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <motion.h2
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="font-semibold text-lg"
                  >
                    {/* Profile */}
                  </motion.h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </motion.button>
                </div>

                {/* User Info */}
                <motion.div
                  className="flex flex-col items-center mb-6"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="relative mb-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      className="cursor-pointer group"
                      onClick={handleAvatarClick}
                    >
                      <img
                        src={
                          currentUser?.avatar_url ||
                          "https://i.postimg.cc/c1t7Yy6p/1.png"
                        }
                        alt="User avatar"
                        className="object-cover rounded-full w-20 h-20 ring-4 ring-[#58A942]/20"
                      />

                      {/* Upload Overlay */}
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ opacity: 1 }}
                      >
                        {uploading ? (
                          <Loader2
                            size={24}
                            className="animate-spin text-white"
                          />
                        ) : (
                          <Upload size={24} className="text-white" />
                        )}
                      </motion.div>
                    </motion.div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={uploadAvatar}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Editable Name Field */}
                  <div className="w-full text-center">
                    {editingName ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={updateFullName}
                          disabled={updatingName}
                          className="dark:bg-[#1a1a1b] bg-white shadow text-white px-3 py-1.5 rounded-lg text-lg font-medium w-full max-w-[200px] focus:outline-none focus:ring-2 focus:ring-[#58A942] disabled:opacity-50"
                          placeholder="Enter your name"
                        />
                        {updatingName ? (
                          <Loader2
                            size={18}
                            className="animate-spin text-[#58A942]"
                          />
                        ) : (
                          <button
                            onClick={updateFullName}
                            className="text-[#58A942] hover:text-[#6bbf4f] transition-colors"
                          >
                            <Check size={18} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 group">
                        <h3 className="font-medium text-lg">
                          {currentUser?.full_name || "Add your name"}
                        </h3>
                        <button
                          onClick={() => {
                            setEditingName(true);
                            setNewFullName(currentUser?.full_name || "");
                          }}
                          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#58A942]"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mt-1">
                    {authUser?.email}
                  </p>

                  {/* Upload status */}
                  {uploading && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#58A942] mt-2"
                    >
                      Uploading avatar...
                    </motion.p>
                  )}
                </motion.div>

                {/* Menu Items */}
                <motion.div
                  className="space-y-2"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.2,
                      },
                    },
                  }}
                >
                  {/* <motion.button
                    variants={{
                      hidden: { x: -20, opacity: 0 },
                      visible: { x: 0, opacity: 1 },
                    }}
                    whileHover={{ x: 4, backgroundColor: "#2a2a2b" }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    <User size={16} className="text-gray-400" />
                    <span>My Profile</span>
                  </motion.button>

                  <motion.button
                    variants={{
                      hidden: { x: -20, opacity: 0 },
                      visible: { x: 0, opacity: 1 },
                    }}
                    whileHover={{ x: 4, backgroundColor: "#2a2a2b" }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    <Settings size={16} className="text-gray-400" />
                    <span>Settings</span>
                  </motion.button> */}

                  {/* <motion.button
                    variants={{
                      hidden: { x: -20, opacity: 0 },
                      visible: { x: 0, opacity: 1 },
                    }}
                    whileHover={{ x: 4, backgroundColor: "#2a2a2b" }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                    onClick={() => {
                      setActiveTab("stats");
                      setIsModalOpen(true);
                    }}
                  >
                    <span>Stats</span>
                  </motion.button> */}

                  {/* <motion.div
                    variants={{
                      hidden: { x: -20, opacity: 0 },
                      visible: { x: 0, opacity: 1 },
                    }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-3 py-2  justify-between rounded-lg text-sm transition-colors"
                  >
                    <motion.div className="w-full flex items-center gap-3  rounded-lg text-sm transition-colors">
                      <Palette size={16} className="text-gray-400" />

                      <span>Theme</span>
                    </motion.div>

                    <motion.div>
                      <ToggleSwitch
                        onChange={handleToggleChange}
                        defaultChecked={theme === "dark"}
                        isThemeToggle={true}
                      />
                    </motion.div>
                  </motion.div> */}

                  <motion.div
                    variants={{
                      hidden: { x: -20, opacity: 0 },
                      visible: { x: 0, opacity: 1 },
                    }}
                    className="pt-2 mt-2 border-t border-[#2a2a2b]"
                  >
                    <motion.button
                      whileHover={{ x: 4, backgroundColor: "#2a2a2b" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sign out</span>
                    </motion.button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
