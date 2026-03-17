// src/auth/AuthContext.tsx
import supabase from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useEffect, useState, type ReactNode } from "react";

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  currentUser: UserProfile | null;
  loading: boolean;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  currentUser: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // const fetchUserProfile = async (userId: string) => {
  //   const { data, error } = await supabase
  //     .from("users")
  //     .select("*")
  //     .eq("id", userId)
  //     .maybeSingle();

  //   if (error) {
  //     console.error("Error fetching user profile:", error);
  //     setCurrentUser(null);
  //     return;
  //   }

  //   setCurrentUser(data ?? null);
  // };

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // await fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // await fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
        }

        setLoading(false);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
