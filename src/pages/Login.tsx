/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [showInput, setShowInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  // Check for existing session on component mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session: any = data.session;

      // If user is authenticated, redirect to dashboard
      if (session?.user) {
        navigate("/dashboard", { replace: true });
        // await fetchUserProfile(session.user.id);
      }
    } finally {
      /* empty */
    }
  };

  const handleShowInput = () => {
    setShowInput(!showInput);
  };

  const magicLink = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Magic link sent! Check your email", {
          description: `We've sent a login link to ${email}`,
          duration: 5000, // Optional: customize duration
        });
        setEmail(""); // Optional: clear email after success
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full max-w-full mx-auto flex justify-center items-center "
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex justify-center items-center flex-col max-w-80 w-full  rounded-xl px-5 py-7 bg-[#1a1a1b]"
      >
        <motion.h2
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-base tracking-tight font-bold mb-6"
        ></motion.h2>
        <motion.h3
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
          className=" mb-6 text-base tracking-tight"
        >
          Plan with ease
        </motion.h3>

        <AnimatePresence mode="wait">
          {showInput ? (
            <motion.div
              key="email-input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex w-full justify-end"
              >
                <Button
                  onClick={handleShowInput}
                  className=""
                  disabled={isLoading}
                >
                  <ChevronLeft />
                </Button>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.input
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-full rounded-lg dark:bg-[#1a1a1b] bg-white shadow px-3 py-2 text-sm outline-none focus:ring-2! focus:ring-[#58A942]/500!"
                  disabled={isLoading}
                />
              </motion.div>

              <div className="flex gap-2">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    onClick={magicLink}
                    className="w-full rounded-4xl"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send"}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="email-button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                className="rounded-4xl"
                onClick={handleShowInput}
                disabled={isLoading}
              >
                Continue with Email
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
