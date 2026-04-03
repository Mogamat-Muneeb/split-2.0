import { useAuth } from "@/auth/useAuth";
import supabase from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { navItems } from "@/lib/utils";
import ToggleSwitch from "./toggle-switch";
import { useTheme } from "next-themes";

const FloatingNav = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile>();
  const { theme, setTheme } = useTheme();

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
    <div className="w-fit fixed bottom-4 left-0 right-0 mx-auto block lg:hidden z-[100]">
      <div className="flex gap-10 items-center transition-all duration-200  p-2 min-w-[150px] w-full  rounded-3xl blur-in bg-[#FAF6FA] dark:bg-[#2d2d2d]">
        <div className="flex items-center justify-center ">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  rounded-full h-10 w-10 items-center flex justify-center transition-all duration-200
                  text-sm

                 ${active ? "bg-orange-600 text-black font-bold " : "bg-[#FAF6FA] dark:bg-[#2d2d2d]"} `}
                aria-label={item.label}
              >
                <Icon
                  className={`stroke-[1.75px] ${active ? "dark:stroke-white stroke-black" : "dark:stroke-white stroke-black"} `}
                  size={20}
                />
              </Link>
            );
          })}
        </div>

        <div className=" flex gap-3 items-center">
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
                className="object-cover rounded-full w-6 h-6 ring-2 ring-transparent border hover:ring-[#9eed00] transition-all"
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
                className="object-cover rounded-full w-6 h-6 ring-2 ring-transparent border hover:ring-[#9eed00] transition-all"
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingNav;
