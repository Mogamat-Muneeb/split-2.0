import { useAuth } from "@/auth/useAuth";
import supabase from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";
import { ClipboardList, Dumbbell, House, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const FloatingNav = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile>();

  const navItems = [
    {
      id: "home",
      path: "/dashboard",
      icon: House,
      label: "Home",
    },
    {
      id: "workouts",
      path: "/dashboard/splits",
      icon: ClipboardList,
      label: "Workouts",
    },
    {
      id: "exercises",
      path: "/dashboard/exercises",
      icon: Dumbbell,
      label: "Exercises",
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

  return (
    <div className="w-fit fixed bottom-4 left-0 right-0 mx-auto">
      <div className="flex gap-10 items-center transition-all duration-200  p-2 min-w-[150px] w-full border rounded-3xl blur-in bg-white/50 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-center ">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                rounded-full p-2 hover:bg-gray-100 transition-all duration-200
                `}
                aria-label={item.label}
              >
                <Icon
                  className="stroke-[1.75px]"
                  size={20}
                  stroke={active ? "black" : "gray"}
                />
              </Link>
            );
          })}
        </div>

        <div className=" flex gap-3">
          <div className="object-cover rounded-full w-6 h-6 ring-2 ring-transparent  bg-[#9eed00] hover:scale-95 transition-all flex justify-center items-center">
            <Plus size={16} />
          </div>
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
