/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Ellipsis, SquarePen, Trash2, Send, ListChecks } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { Link, useNavigate } from "react-router-dom";
import supabase from "@/lib/supabase";

const dummyGoals = [
  {
    id: "1",
    title: "Daily Workout",
    description: "Complete your workout for today",

    deadline_date: "2026-01-15",
    deadline_interval: null,
    deadline_type: "date",
    steps: [
      { id: "s1", title: "Push-ups", is_completed: false },
      { id: "s2", title: "Squats", is_completed: true },
    ],
    goal_members: [{ id: "m1", role: "owner", users: { full_name: "You" } }],
    created_at: "2026-02-13T21:57:28.735775+00:00",
  },
  {
    id: "2",
    title: "Read Book",
    description: "Read at least 20 pages",
    deadline_date: "2026-01-15",
    deadline_interval: null,
    deadline_type: "date",
    steps: [
      { id: "s3", title: "Chapter 1", is_completed: false },
      { id: "s4", title: "Chapter 2", is_completed: false },
      { id: "s5", title: "Chapter 3", is_completed: false },
    ],
    goal_members: [{ id: "m2", role: "editor", users: { full_name: "Alice" } }],
    created_at: "2026-10-13T21:57:28.735775+00:00",
  },
  {
    id: "3",
    title: "Project Work",
    description: "Finish milestone 1",
    deadline_date: null,
    deadline_interval: null,
    deadline_type: "daily",
    steps: [{ id: "s6", title: "Setup repo", is_completed: true }],
    goal_members: [{ id: "m3", role: "owner", users: { full_name: "You" } }],
    created_at: "2026-02-20T21:57:28.735775+00:00",
  },
];

// Writing animation variants
const titleVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.1,
    },
  }),
};

// Solid background variant for "achieve"
const solidBackgroundVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function Home() {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const [showDescription, setShowDescription] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showAchieveBackground, setShowAchieveBackground] = useState(false);

  const mainTitle = "Goals made faster";
  const description = "Track, manage, and achieve";

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
      // eslint-disable-next-line no-empty
    } finally {
    }
  };

  // Trigger animations sequentially
  useEffect(() => {
    // Show description after title animation
    const timer1 = setTimeout(
      () => {
        setShowDescription(true);
      },
      mainTitle.length * 100 + 500,
    );

    // Show cards after description
    const timer2 = setTimeout(
      () => {
        setShowCards(true);
      },
      mainTitle.length * 100 + description.length * 50 + 1500,
    );

    // Show achieve background after description appears
    const timer3 = setTimeout(
      () => {
        setShowAchieveBackground(true);
      },
      mainTitle.length * 100 + description.length * 50 + 800,
    );

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getProgressPercent = (goal: any) => {
    if (!goal.steps.length) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = goal.steps.filter((s: any) => s.is_completed).length;
    return Math.round((completed / goal.steps.length) * 100);
  };

  // Split description to highlight "achieve"
  const descriptionParts = description.split(" ");

  const getDeadlineColor = (goal: any) => {
    if (goal.deadline_type === "daily") return "#58A942";
    if (goal.deadline_type === "every_n_days") return "#F472B6";
    if (goal.deadline_type === "date") return "#F97316";
    return "#9CA3AF";
  };

  const getDeadlineBgColor = (goal: any) => {
    if (goal.deadline_type === "daily") return "#58a94257";
    if (goal.deadline_type === "every_n_days") return "#652e4d";
    if (goal.deadline_type === "date") return "#825124";
    return "#F3F4F6";
  };

  const formatDeadline = (goal: any) => {
    if (goal.deadline_type === "date" && goal.deadline_date) {
      const date = new Date(goal.deadline_date);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date);
    }

    if (goal.deadline_type === "daily") {
      return "Daily";
    }

    if (goal.deadline_type === "every_n_days" && goal.deadline_interval) {
      return `Every ${goal.deadline_interval} days`;
    }

    return "-";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    const datePart = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);

    const timePart = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    const escapeHtml = (text: string) => {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    };

    return `${escapeHtml(datePart)} <span class="w-[3px] h-[3px] flex rounded-full bg-gray-400"></span> ${escapeHtml(timePart)}`;
  };

  return (
    <div className="min-w-full min-h-screen ">
      {/* Header */}

      <div className="relative flex min-h-screen w-full flex-col items-start justify-start overflow-hidden px-2 ">
        <div className="flex justify-between items-center py-2 sticky z-30  top-0 h-[60px]  lg:max-w-[400px] mt-2 max-w-full w-full lg:mx-auto  pt-2  px-2 bg-[#1a1a1b] rounded-3xl">
          <div>
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
          </div>
          <div className="flex items-center gap-4">
            <Link to={"/login"}>
              <Button className="rounded-2xl">Login</Button>
            </Link>
          </div>
        </div>

        <BackgroundRippleEffect rows={22} />

        <div className="lg:max-w-[1200px] mx-auto  w-full px-4 lg:pt-32 pt-16 pb-16  z-[999] ">
          <div className="text-center w-full">
            {/* Animated Title */}
            <h1 className="lg:text-5xl text-4xl pb-4  font-bold   flex justify-center items-center">
              <span className="text-white">
                {mainTitle.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    variants={titleVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className="inline-block font-black tracking-tighter"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </span>
            </h1>

            {/* Animated Description with Highlighted "achieve" */}
            <AnimatePresence>
              {showDescription && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-gray-400 text-base tracking-tight max-w-2xl mx-auto mb-10 relative"
                >
                  {descriptionParts.map((word, index) => {
                    if (word.toLowerCase() === "achieve") {
                      return (
                        <span
                          key={index}
                          className="relative inline-block mx-2 "
                        >
                          {/* Solid background behind the text */}
                          <AnimatePresence>
                            {showAchieveBackground && (
                              <motion.span
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                //@ts-ignore
                                variants={solidBackgroundVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="absolute inset-0 -inset-x-1 -inset-y-1  bg-gradient-to-r from-[#40E740] to-[#246B81] opacity-20"
                                style={{ zIndex: -2 }}
                              />
                            )}
                          </AnimatePresence>

                          <span className="relative z-10 font-black text-white">
                            {word}
                          </span>
                        </span>
                      );
                    }
                    return (
                      <span key={index} className="inline-block ">
                        {word}
                      </span>
                    );
                  })}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Goals Cards Grid */}
          <AnimatePresence>
            {showCards && (
              <motion.div
                className="flex flex-col gap-4 mt-4 lg:max-w-[600px] mx-auto w-full!  px-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.15,
                    },
                  },
                }}
              >
                {dummyGoals.map((goal) => (
                  <motion.div
                    key={goal.id}
                    variants={{
                      hidden: {
                        opacity: 0,
                        y: 20,
                        scale: 0.95,
                      },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          type: "spring",
                          damping: 15,
                          stiffness: 100,
                        },
                      },
                    }}
                    className={`p-4 rounded-xl cursor-pointer transition-all bg-[#1a1a1b]`}
                    onClick={() =>
                      setSelectedGoal(selectedGoal === goal.id ? null : goal.id)
                    }
                  >
                    <div className="flex items-center justify-between w-full ">
                      <div
                        className="flex items-center gap-1 text-xs py-1 text-gray-400"
                        dangerouslySetInnerHTML={{
                          __html: formatDate(goal?.created_at),
                        }}
                      ></div>

                      <div
                        className="text-xs py-1 rounded-lg px-1"
                        style={{
                          color: getDeadlineColor(goal),
                          backgroundColor: getDeadlineBgColor(goal),
                        }}
                      >
                        {formatDeadline(goal)}
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-base font-bold tracking-tight">
                          {goal.title}
                        </h2>
                        <p className="text-xs line-clamp-1">
                          {goal.description}
                        </p>
                      </div>
                    </div>
                    <button
                      // onClick={() => setProgressMode(goal.id, "me")}
                      className={`text-xs px-2 py-0.5 rounded-full transition mt-3 bg-green-500/20 text-green-400`}
                    >
                      My Progress
                    </button>

                    <div className="flex justify-between items-center mt-3 text-xs text-gray-300">
                      <span>{goal.steps.length} steps</span>
                      <span>{getProgressPercent(goal)}%</span>
                    </div>

                    <div className="h-1 w-full rounded-full bg-[#2a2a2b] overflow-hidden">
                      <div
                        className={`h-full transition-all 
                          bg-[#58A942]
                        `}
                        style={{
                          width: `${getProgressPercent(goal)}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="rounded-lg border w-fit h-fit px-1 py-0.5 cursor-pointer">
                            <Ellipsis size={18} />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-40 z-[9999] mr-2">
                          <DropdownMenuGroup>
                            <DropdownMenuItem>
                              Edit
                              <DropdownMenuShortcut>
                                <SquarePen size={12} />
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Delete
                              <DropdownMenuShortcut>
                                <Trash2 size={12} />
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Steps
                              <DropdownMenuShortcut>
                                <ListChecks size={12} />
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Share
                              <DropdownMenuShortcut>
                                <Send size={12} />
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {selectedGoal === goal.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2 mt-3 px-1 overflow-hidden"
                      >
                        {goal.steps.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-center justify-between rounded-lg p-2 dark:bg-[#1a1a1b] bg-white shadow"
                          >
                            <label className="flex items-center gap-2 text-sm flex-1">
                              <motion.input
                                type="checkbox"
                                checked={step.is_completed}
                                className="accent-[#58A942] cursor-pointer"
                                whileTap={{ scale: 0.9 }}
                                transition={{ duration: 0.1 }}
                              />
                              <motion.span
                                animate={{
                                  textDecoration: step.is_completed
                                    ? "line-through"
                                    : "none",
                                  color: step.is_completed
                                    ? "#6b7280"
                                    : "inherit",
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                {step.title}
                              </motion.span>
                            </label>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hero Section */}
    </div>
  );
}
