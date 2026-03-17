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
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
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
        </motion.h2>
        <motion.h3
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
          className=" mb-6 text-base tracking-tight"
        >
          Where goals come to life
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
