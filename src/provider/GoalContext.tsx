// /* eslint-disable @typescript-eslint/ban-ts-comment */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
//   useCallback,
// } from "react";
// import supabase from "@/lib/supabase";

// import type { Goal } from "@/lib/types";
// import { useAuth } from "@/auth/useAuth";

// type GoalContextType = {
//   goals: Goal[];
//   loadingGoals: boolean;

//   isGoalModalOpen: boolean;
//   editingGoal: Goal | null;

//   openCreateGoal: () => void;
//   openEditGoal: (goal: Goal) => void;
//   closeGoalModal: () => void;
//   deleteGoal: (goalId: string) => Promise<void>;
//   refreshGoals: () => Promise<void>;
// };

// const GoalContext = createContext<GoalContextType>(null!);

// export function GoalProvider({ children }: { children: React.ReactNode }) {
//   const { user } = useAuth();

//   const [goals, setGoals] = useState<Goal[]>([]);
//   const [loadingGoals, setLoadingGoals] = useState(true);

//   const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
//   const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

//   const fetchGoals = useCallback(async () => {
//     if (!user) {
//       setGoals([]);
//       setLoadingGoals(false);
//       return;
//     }

//     setLoadingGoals(true);

//     try {
//       const { data: ownedGoals, error: ownedGoalsError } = await supabase
//         .from("goals")
//         .select(
//           `
//     *,
//     steps:goal_steps (
//       id,
//       goal_id,
//       title,
//       position,
//       created_at,
//       progress:goal_step_progress (
//         completed_at,
//         user_id
//       )
//     ),
//     progress:goal_progress_stats (
//   user_id,
//   completed_steps,
//   total_steps,
//   progress_percent,
//   completed_at
// ),
//     notes:goal_notes (
//       id,
//       goal_id,
//       user_id,
//       content,
//       created_at,
//       updated_at
//     ),
//     goal_members!inner (
//       id,
//       goal_id,
//       user_id,
//       role,
//       created_at,
//       users(*)
//     ),
//     attachments:goal_attachments (
//       id,
//       goal_id,
//       user_id,
//       file_url,
//       file_name,
//       file_size,
//       file_type,
//       created_at
//     ),
//       goal_tags(
//       tags(*)
//     )
//   `,
//         )
//         .eq("user_id", user.id);

//       if (ownedGoalsError) throw ownedGoalsError;

//       const { data: memberGoals, error: memberGoalsError } = await supabase
//         .from("goal_members")
//         .select(
//           `
//     goal_id,
//     goals!inner (
//       *,
//       steps:goal_steps (
//         id,
//         goal_id,
//         title,
//         position,
//         created_at,
//         progress:goal_step_progress (
//           completed_at,
//           user_id
//         )
//       ),
//       progress:goal_progress_stats (
//   user_id,
//   completed_steps,
//   total_steps,
//   progress_percent,
//   completed_at
// ),
//       notes:goal_notes (
//         id,
//         goal_id,
//         user_id,
//         content,
//         created_at,
//         updated_at
//       ),
//       attachments:goal_attachments (
//         id,
//         goal_id,
//         user_id,
//         file_url,
//         file_name,
//         file_size,
//         file_type,
//         created_at
//       )
//     )
//         goal_tags(
//       tags(*)
//     )
//   `,
//         )
//         .eq("user_id", user.id)
//         .neq("goals.user_id", user.id);

//       if (memberGoalsError) throw memberGoalsError;

//       const memberGoalsWithFullMembers = await Promise.all(
//         (memberGoals || []).map(async (item: any) => {
//           const goal = item.goals;

//           const { data: allMembers } = await supabase
//             .from("goal_members")
//             .select(
//               `
//               id,
//               goal_id,
//               user_id,
//               role,
//               created_at,
//               users(*)
//             `,
//             )
//             //@ts-ignore
//             .eq("goal_id", goal.id);

//           return {
//             ...goal,
//             goal_members: allMembers || [],
//           };
//         }),
//       );

//       const allGoals = [
//         ...(ownedGoals || []),
//         ...memberGoalsWithFullMembers.filter(
//           //@ts-ignore
//           (g) => !ownedGoals?.some((og) => og.id === g.id),
//         ),
//       ];

//       const normalizeSteps = (goal: any) => ({
//         ...goal,
//         steps: (goal.steps || []).map((step: any) => {
//           const userProgress = step.progress?.find(
//             (p: any) => p.user_id === user.id,
//           );

//           return {
//             ...step,
//             is_completed: Boolean(userProgress?.completed_at),
//           };
//         }),
//       });

//       setGoals(allGoals.map(normalizeSteps));
//     } catch (error) {
//       console.error("Error fetching goals:", error);
//       setGoals([]);
//     } finally {
//       setLoadingGoals(false);
//     }
//   }, [user]);

//   const openCreateGoal = () => {
//     setEditingGoal(null);
//     setIsGoalModalOpen(true);
//   };

//   const openEditGoal = (goal: Goal) => {
//     setEditingGoal(goal);
//     setIsGoalModalOpen(true);
//   };

//   const closeGoalModal = () => {
//     setEditingGoal(null);
//     setIsGoalModalOpen(false);
//   };

//   const deleteGoal = async (goalId: string) => {
//     const goal = goals.find((g) => g.id === goalId);

//     if (!goal || goal.user_id !== user?.id) {
//       console.warn("Only owners can delete goals");
//       return;
//     }

//     const { error } = await supabase.from("goals").delete().eq("id", goalId);

//     if (error) {
//       console.error("Error deleting goal:", error);
//     }
//   };

//   const refreshGoals = useCallback(async () => {
//     await fetchGoals();
//   }, [fetchGoals]);

//   useEffect(() => {
//     if (!user) {
//       setGoals([]);
//       setLoadingGoals(false);
//       return;
//     }

//     fetchGoals();

//     const channel = supabase
//       .channel(`goals-${user.id}`)

//       .on(
//         "postgres_changes",
//         {
//           event: "INSERT",
//           schema: "public",
//           table: "goals",
//           filter: `user_id=eq.${user.id}`,
//         },
//         () => {
//           fetchGoals();
//         },
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "goals",
//         },
//         (payload) => {
//           const updatedGoal = payload.new;
//           const existingGoal = goals.find((g) => g.id === updatedGoal.id);

//           if (existingGoal) {
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//             setGoals((prev: any) =>
//               // eslint-disable-next-line @typescript-eslint/no-explicit-any
//               prev.map((goal: { id: any; steps: any; goal_members: any }) =>
//                 goal.id === updatedGoal.id
//                   ? {
//                       ...updatedGoal,
//                       steps: goal.steps,
//                       goal_members: goal.goal_members,
//                     }
//                   : goal,
//               ),
//             );
//           } else {
//             fetchGoals();
//           }
//         },
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "DELETE",
//           schema: "public",
//           table: "goals",
//         },
//         (payload) => {
//           const deletedGoal = payload.old;
//           setGoals((prev) => prev.filter((g) => g.id !== deletedGoal.id));
//         },
//       )

//       // Add this inside your channel subscriptions, after the step progress subscription
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "goal_attachments",
//         },
//         (payload) => {
//           const attachment = payload.new || payload.old;
//           if (!attachment) return;

//           setGoals((prev: any) =>
//             prev.map((goal: any) => {
//               //@ts-ignore
//               if (goal.id === attachment.goal_id) {
//                 const currentAttachments = goal.attachments || [];

//                 switch (payload.eventType) {
//                   case "INSERT":
//                     return {
//                       ...goal,
//                       attachments: [...currentAttachments, attachment],
//                     };
//                   case "DELETE":
//                     return {
//                       ...goal,
//                       attachments: currentAttachments.filter(
//                         //@ts-ignore
//                         (a) => a.id !== attachment.id,
//                       ),
//                     };
//                   case "UPDATE":
//                     return {
//                       ...goal,
//                       //@ts-ignore
//                       attachments: currentAttachments.map((a) =>
//                         //@ts-ignore
//                         a.id === attachment.id ? attachment : a,
//                       ),
//                     };
//                   default:
//                     return goal;
//                 }
//               }
//               return goal;
//             }),
//           );
//         },
//       )

//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "goal_notes",
//         },
//         (payload) => {
//           const note: any = payload.new || payload.old;
//           if (!note) return;

//           setGoals((prev: any) =>
//             prev.map((goal: any) => {
//               if (goal.id !== note.goal_id) return goal;

//               const currentNotes = goal.notes || [];

//               switch (payload.eventType) {
//                 case "INSERT":
//                   return {
//                     ...goal,
//                     notes: [...currentNotes, note],
//                   };

//                 case "DELETE":
//                   return {
//                     ...goal,
//                     notes: currentNotes.filter((n: any) => n.id !== note.id),
//                   };

//                 case "UPDATE":
//                   return {
//                     ...goal,
//                     notes: currentNotes.map((n: any) =>
//                       n.id === note.id ? note : n,
//                     ),
//                   };

//                 default:
//                   return goal;
//               }
//             }),
//           );
//         },
//       )

//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "goal_members",
//           filter: `user_id=eq.${user.id}`,
//         },
//         () => {
//           fetchGoals();
//         },
//       )

//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "goal_steps",
//         },
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         (payload: any) => {
//           const goalId = payload.new?.goal_id || payload.old?.goal_id;

//           setGoals((prev) =>
//             prev.map((goal) => {
//               if (goal.id === goalId) {
//                 return {
//                   ...goal,
//                   _needsRefresh: true,
//                 };
//               }
//               return goal;
//             }),
//           );

//           setTimeout(() => {
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//             setGoals((prev: any) => {
//               // eslint-disable-next-line @typescript-eslint/no-explicit-any
//               const needsRefresh: any = prev.some((g: any) => g._needsRefresh);
//               if (needsRefresh) {
//                 fetchGoals();
//               }
//               // eslint-disable-next-line @typescript-eslint/no-explicit-any
//               return prev.map((g: any) => {
//                 // eslint-disable-next-line @typescript-eslint/no-unused-vars
//                 const { _needsRefresh, ...rest } = g;
//                 return rest;
//               });
//             });
//           }, 100);
//         },
//       )

//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "goal_step_progress",
//         },
//         (payload) => {
//           const progress = payload.new || payload.old;
//           if (!progress) return;

//           setGoals((prev) =>
//             prev.map((goal: any) => ({
//               ...goal,
//               steps: goal.steps.map((step: any) => {
//                 //@ts-ignore
//                 if (step.id === progress.step_id) {
//                   const isCompleted =
//                     payload.eventType === "INSERT" ||
//                     //@ts-ignore
//                     (payload.eventType === "UPDATE" && progress.completed_at);

//                   return {
//                     ...step,
//                     is_completed: isCompleted,
//                     progress:
//                       payload.eventType === "DELETE"
//                         ? step.progress?.filter(
//                             //@ts-ignore
//                             (p) => p.user_id !== progress.user_id,
//                           )
//                         : [
//                             ...(step.progress?.filter(
//                               //@ts-ignore
//                               (p) => p.user_id !== progress.user_id,
//                             ) || []),
//                             progress,
//                           ],
//                   };
//                 }
//                 return step;
//               }),
//             })),
//           );
//         },
//       )

//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [user, fetchGoals]);

//   return (
//     <GoalContext.Provider
//       value={{
//         goals,
//         loadingGoals,
//         isGoalModalOpen,
//         editingGoal,
//         openCreateGoal,
//         openEditGoal,
//         closeGoalModal,
//         deleteGoal,
//         refreshGoals,
//       }}
//     >
//       {children}
//     </GoalContext.Provider>
//   );
// }

// // eslint-disable-next-line react-refresh/only-export-components
// export const useGoal = () => useContext(GoalContext);


/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import supabase from "@/lib/supabase";

import type { Goal } from "@/lib/types";
import { useAuth } from "@/auth/useAuth";

type GoalContextType = {
  goals: Goal[];
  loadingGoals: boolean;

  isGoalModalOpen: boolean;
  editingGoal: Goal | null;

  openCreateGoal: () => void;
  openEditGoal: (goal: Goal) => void;
  closeGoalModal: () => void;
  deleteGoal: (goalId: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
};

const GoalContext = createContext<GoalContextType>(null!);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setLoadingGoals(false);
      return;
    }

    setLoadingGoals(true);

    try {
      const { data: ownedGoals, error: ownedGoalsError } = await supabase
        .from("goals")
        .select(
          `
    *,
    steps:goal_steps (
      id,
      goal_id,
      title,
      position,
      created_at,
      progress:goal_step_progress (
        completed_at,
        user_id
      )
    ),
    progress:goal_progress_stats (
  user_id,
  completed_steps,
  total_steps,
  progress_percent,
  completed_at
),
    notes:goal_notes (
      id,
      goal_id,
      user_id,
      content,
      created_at,
      updated_at
    ),
    goal_members!inner (
      id,
      goal_id,
      user_id,
      role,
      created_at,
      users(*)
    ),
    attachments:goal_attachments (
      id,
      goal_id,
      user_id,
      file_url,
      file_name,
      file_size,
      file_type,
      created_at
    ),
      goal_tags(
   tag_id,
  user_id,
  tags (*)
    )
  `,
        )
        .eq("user_id", user.id)
        .eq("goal_tags.user_id", user.id)

      if (ownedGoalsError) throw ownedGoalsError;

      const { data: memberGoals, error: memberGoalsError } = await supabase
        .from("goal_members")
//         .select(
//           `
//     goal_id,
//     goals!inner (
//       *,
//       steps:goal_steps (
//         id,
//         goal_id,
//         title,
//         position,
//         created_at,
//         progress:goal_step_progress (
//           completed_at,
//           user_id
//         )
//       ),
//       progress:goal_progress_stats (
//   user_id,
//   completed_steps,
//   total_steps,
//   progress_percent,
//   completed_at
// ),
//       notes:goal_notes (
//         id,
//         goal_id,
//         user_id,
//         content,
//         created_at,
//         updated_at
//       ),
//       attachments:goal_attachments (
//         id,
//         goal_id,
//         user_id,
//         file_url,
//         file_name,
//         file_size,
//         file_type,
//         created_at
//       )
//     )
//         goal_tags(
//       tag_id,
//   user_id,
//   tags (*)
//     )
//   `,
//         )]
.select(`
  goal_id,
  goals!inner (
    *,
    steps:goal_steps (
      id,
      goal_id,
      title,
      position,
      created_at,
      progress:goal_step_progress (
        completed_at,
        user_id
      )
    ),
    progress:goal_progress_stats (
      user_id,
      completed_steps,
      total_steps,
      progress_percent,
      completed_at
    ),
    notes:goal_notes (
      id,
      goal_id,
      user_id,
      content,
      created_at,
      updated_at
    ),
    attachments:goal_attachments (
      id,
      goal_id,
      user_id,
      file_url,
      file_name,
      file_size,
      file_type,
      created_at
    ),
    goal_tags (
      tag_id,
      user_id,
      tags (*)
    )
  )
`)
        .eq("user_id", user.id)
        .neq("goals.user_id", user.id);

      if (memberGoalsError) throw memberGoalsError;

      const memberGoalsWithFullMembers = await Promise.all(
        (memberGoals || []).map(async (item: any) => {
          const goal = item.goals;

          const { data: allMembers } = await supabase
            .from("goal_members")
            .select(
              `
              id,
              goal_id,
              user_id,
              role,
              created_at,
              users(*)
            `,
            )
            //@ts-ignore
            .eq("goal_id", goal.id);

          return {
            ...goal,
            goal_members: allMembers || [],
          };
        }),
      );

      const allGoals = [
        ...(ownedGoals || []),
        ...memberGoalsWithFullMembers.filter(
          //@ts-ignore
          (g) => !ownedGoals?.some((og) => og.id === g.id),
        ),
      ];

      const normalizeSteps = (goal: any) => ({
        ...goal,
        steps: (goal.steps || []).map((step: any) => {
          const userProgress = step.progress?.find(
            (p: any) => p.user_id === user.id,
          );

          return {
            ...step,
            is_completed: Boolean(userProgress?.completed_at),
          };
        }),
      });

      setGoals(allGoals.map(normalizeSteps));
    } catch (error) {
      console.error("Error fetching goals:", error);
      setGoals([]);
    } finally {
      setLoadingGoals(false);
    }
  }, [user]);

  const openCreateGoal = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const closeGoalModal = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(false);
  };

  const deleteGoal = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);

    if (!goal || goal.user_id !== user?.id) {
      console.warn("Only owners can delete goals");
      return;
    }

    const { error } = await supabase.from("goals").delete().eq("id", goalId);

    if (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const refreshGoals = useCallback(async () => {
    await fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoadingGoals(false);
      return;
    }

    fetchGoals();

    const channel = supabase
      .channel(`goals-${user.id}`)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "goals",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchGoals();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "goals",
        },
        (payload) => {
          const updatedGoal = payload.new;
          const existingGoal = goals.find((g) => g.id === updatedGoal.id);

          if (existingGoal) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setGoals((prev: any) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              prev.map((goal: { id: any; steps: any; goal_members: any }) =>
                goal.id === updatedGoal.id
                  ? {
                      ...updatedGoal,
                      steps: goal.steps,
                      goal_members: goal.goal_members,
                    }
                  : goal,
              ),
            );
          } else {
            fetchGoals();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "goals",
        },
        (payload) => {
          const deletedGoal = payload.old;
          setGoals((prev) => prev.filter((g) => g.id !== deletedGoal.id));
        },
      )

      // Add this inside your channel subscriptions, after the step progress subscription
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goal_attachments",
        },
        (payload) => {
          const attachment = payload.new || payload.old;
          if (!attachment) return;

          setGoals((prev: any) =>
            prev.map((goal: any) => {
              //@ts-ignore
              if (goal.id === attachment.goal_id) {
                const currentAttachments = goal.attachments || [];

                switch (payload.eventType) {
                  case "INSERT":
                    return {
                      ...goal,
                      attachments: [...currentAttachments, attachment],
                    };
                  case "DELETE":
                    return {
                      ...goal,
                      attachments: currentAttachments.filter(
                        //@ts-ignore
                        (a) => a.id !== attachment.id,
                      ),
                    };
                  case "UPDATE":
                    return {
                      ...goal,
                      //@ts-ignore
                      attachments: currentAttachments.map((a) =>
                        //@ts-ignore
                        a.id === attachment.id ? attachment : a,
                      ),
                    };
                  default:
                    return goal;
                }
              }
              return goal;
            }),
          );
        },
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goal_notes",
        },
        (payload) => {
          const note: any = payload.new || payload.old;
          if (!note) return;

          setGoals((prev: any) =>
            prev.map((goal: any) => {
              if (goal.id !== note.goal_id) return goal;

              const currentNotes = goal.notes || [];

              switch (payload.eventType) {
                case "INSERT":
                  return {
                    ...goal,
                    notes: [...currentNotes, note],
                  };

                case "DELETE":
                  return {
                    ...goal,
                    notes: currentNotes.filter((n: any) => n.id !== note.id),
                  };

                case "UPDATE":
                  return {
                    ...goal,
                    notes: currentNotes.map((n: any) =>
                      n.id === note.id ? note : n,
                    ),
                  };

                default:
                  return goal;
              }
            }),
          );
        },
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goal_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchGoals();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goal_steps",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const goalId = payload.new?.goal_id || payload.old?.goal_id;

          setGoals((prev) =>
            prev.map((goal) => {
              if (goal.id === goalId) {
                return {
                  ...goal,
                  _needsRefresh: true,
                };
              }
              return goal;
            }),
          );

          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setGoals((prev: any) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const needsRefresh: any = prev.some((g: any) => g._needsRefresh);
              if (needsRefresh) {
                fetchGoals();
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return prev.map((g: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _needsRefresh, ...rest } = g;
                return rest;
              });
            });
          }, 100);
        },
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goal_step_progress",
        },
        (payload) => {
          const progress = payload.new || payload.old;
          if (!progress) return;

          setGoals((prev) =>
            prev.map((goal: any) => ({
              ...goal,
              steps: goal.steps.map((step: any) => {
                //@ts-ignore
                if (step.id === progress.step_id) {
                  const isCompleted =
                    payload.eventType === "INSERT" ||
                    //@ts-ignore
                    (payload.eventType === "UPDATE" && progress.completed_at);

                  return {
                    ...step,
                    is_completed: isCompleted,
                    progress:
                      payload.eventType === "DELETE"
                        ? step.progress?.filter(
                            //@ts-ignore
                            (p) => p.user_id !== progress.user_id,
                          )
                        : [
                            ...(step.progress?.filter(
                              //@ts-ignore
                              (p) => p.user_id !== progress.user_id,
                            ) || []),
                            progress,
                          ],
                  };
                }
                return step;
              }),
            })),
          );
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchGoals, goals]);

  return (
    <GoalContext.Provider
      value={{
        goals,
        loadingGoals,
        isGoalModalOpen,
        editingGoal,
        openCreateGoal,
        openEditGoal,
        closeGoalModal,
        deleteGoal,
        refreshGoals,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useGoal = () => useContext(GoalContext);