import { useAuth } from "@/auth/useAuth";
import supabase from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";
import { ClipboardList, Dumbbell, History, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";

import { useTheme } from "next-themes";
import ToggleSwitch from "./toggle-switch";

const Navbar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile>();
  const { theme , setTheme } = useTheme();
  const navItems = [
    {
      id: "stats",
      path: "/dashboard/stats",
      icon: History,
      label: "Stats",
    },
    {
      id: "home",
      path: "/dashboard",
      icon: Plus,
      label: "Home",
    },
    {
      id: "workouts",
      path: "/dashboard/splits",
      icon: ClipboardList,
      label: "Workouts",
    },
  ];

  const isActive = (itemPath: string) => {
    if (itemPath === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(itemPath);
  };

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
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [authUser?.id]);

  const handleToggleChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className=" lg:flex justify-center items-center h-full min-h-screen">
      <div className="p-3 lg:flex flex-col hidden justify-center  gap-4 items-center bg-[#FAF6FA] dark:bg-[#2d2d2d] h-full rounded-4xl mx-4">
        <div className="flex flex-col items-center gap-20">
          {/* <div className=" tracking-tight font-black text-2xl">
            SPL<span className="text-orange-600">I</span>T
          </div> */}
          <div className="flex flex-col items-center justify-start gap-4  ">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`
                      rounded-full p-3 transition-all duration-200
                      text-sm

                     ${active ? "bg-orange-600 text-black font-bold px-4" : "bg-[#FAF6FA] dark:bg-[#2d2d2d]"} `}
                  aria-label={item.label}
                >
                  <Icon
                    className={`stroke-[1.75px] ${active ? "stroke-black" : "stroke-white"} `}
                    size={20}
                  />
                </Link>

                // <Link
                //   key={item.id}
                //   to={item.path}
                //   className={`
                //       rounded-full px-3 py-[5px]  transition-all duration-200
                //       text-sm

                //      ${active ? "bg-orange-600 text-black font-bold px-4" : "   bg-[#FAF6FA] dark:bg-[#2d2d2d]"} `}
                //   aria-label={item.label}
                // >
                //   <p>{item.label}</p>
                // </Link>
              );
            })}
          </div>
        </div>
        <div className=" flex flex-col gap-3 items-center">
          {/* <div className="object-cover rounded-full w-6 h-6 ring-2 ring-transparent  bg-[#9eed00] hover:scale-95 transition-all flex justify-center items-center">
              <Plus size={16} />
            </div> */}
          <ToggleSwitch
            onChange={handleToggleChange}
            defaultChecked={theme === "dark"}
            isThemeToggle={true}
          />
          {!currentUser?.avatar_url ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src={"https://i.postimg.cc/c1t7Yy6p/1.png"}
                alt="User avatar"
                className="object-cover rounded-full w-8 h-8 ring-2 ring-transparent border hover:ring-[#9eed00] transition-all"
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
                className="object-cover rounded-full w-8 h-8 ring-2 ring-transparent border hover:ring-[#9eed00] transition-all"
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
