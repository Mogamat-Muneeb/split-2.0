/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoalModal } from "@/components/goal-modal";
import Header from "@/components/header";
import { useGoal } from "@/provider/GoalContext";
import {
  Ellipsis,
  ListChecks,
  Paperclip,
  Plus,
  Send,
  SquarePen,
  Tag,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import Attachment from "@/components/attachment";
import Steps from "@/components/steps";
import ShareGoalModal from "@/components/share-goal-modal";
import { useAuth } from "@/auth/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ManageMembersModal from "@/components/manage-members-modal";
import type { Goal } from "@/lib/types";
import TagCreateForm from "@/components/tag-create-form";
import TagAttachModal from "@/components/tag-attach-menu-item";

type GoalStatus = "overdue" | "completed" | "active";

const Dashboard = () => {
  const { isGoalModalOpen, goals, openEditGoal, deleteGoal, openCreateGoal } =
    useGoal();

  const [shareGoal, setShareGoal] = useState<any | null>(null);
  const { user } = useAuth();
  const [openStepsGoalId, setOpenStepsGoalId] = useState<number | null>(null);
  const [manageMembersGoal, setManageMembersGoal] = useState<any | null>(null);

  const [tags, setTags] = useState<any[]>([]);

  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );
  const [openTagCreateModal, setOpenTagCreateModal] = useState(false);
  const [openTagAttachGoal, setOpenTagAttachGoal] = useState<any | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching tags:", error);
        return;
      }

      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchTags();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("tags-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "tags",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTags((prev) =>
              [...prev, payload.new].sort((a, b) =>
                a.name.localeCompare(b.name),
              ),
            );
          }

          if (payload.eventType === "UPDATE") {
            setTags((prev) =>
              prev
                .map((tag) => (tag.id === payload.new.id ? payload.new : tag))
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
          }

          if (payload.eventType === "DELETE") {
            setTags((prev) => prev.filter((tag) => tag.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTags]);

  const [openAttachmentGoalId, setOpenAttachmentGoalId] = useState<
    number | null
  >(null);

  const descriptionRefs = useRef<Record<number, HTMLParagraphElement | null>>(
    {},
  );

  const isOverflowing = (goalId: number) => {
    const el = descriptionRefs.current[goalId];
    if (!el) return false;

    return el.scrollHeight > el.clientHeight;
  };

  const [progressModeByGoal, setProgressModeByGoal] = useState<
    Record<string, "me" | "team">
  >({});

  const getTeamMemberCount = (goal: any): number => {
    return goal.goal_members?.length || 1;
  };

  const toggleSteps = (goalId: number) => {
    setOpenStepsGoalId((prev) => (prev === goalId ? null : goalId));
  };

  const toggleAttachment = (goalId: number) => {
    setOpenAttachmentGoalId((prev) => (prev === goalId ? null : goalId));

    if (openStepsGoalId === goalId) {
      setOpenStepsGoalId(null);
    }
  };

  const getProgressMode = (goal: Goal): "me" | "team" => {
    return (
      progressModeByGoal[goal.id] ??
      (goal.goal_members?.length > 1 ? "team" : "me")
    );
  };

  const setProgressMode = (goalId: string, mode: "me" | "team") => {
    setProgressModeByGoal((prev) => ({
      ...prev,
      [goalId]: mode,
    }));
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

  const isOverdue = (goal: any) => {
    if (goal.deadline_type !== "date" || !goal.deadline_date) return false;

    const allStepsCompleted =
      goal.steps.length > 0 &&
      goal.steps.every((step: any) => step.progress?.length > 0);

    // treat deadline as END of day
    const deadline = new Date(goal.deadline_date);
    deadline.setHours(23, 59, 59, 999);

    return new Date() > deadline && !allStepsCompleted;
  };

  const isStepCompletedByMe = (step: any) =>
    step.progress?.some((p: any) => p.user_id === user?.id);

  const getStepStats = (goal: any, mode: "me" | "team") => {
    const totalSteps = goal.steps.length;

    if (mode === "me") {
      const completed = goal.steps.filter(isStepCompletedByMe).length;
      return { total: totalSteps, completed };
    }

    const totalMembers = goal.goal_members?.length || 1;

    let totalCompletedActions = 0;

    goal.steps.forEach((step: any) => {
      const uniqueUsers = new Set(
        step.progress?.map((p: any) => p.user_id) || [],
      );

      totalCompletedActions += uniqueUsers.size;
    });

    const totalPossible = totalSteps * totalMembers;

    return {
      total: totalPossible,
      completed: totalCompletedActions,
    };
  };

  const getProgressPercent = (goal: any, mode: "me" | "team") => {
    if (!goal.steps.length) return 0;
    const { total, completed } = getStepStats(goal, mode);
    return Math.round((completed / total) * 100);
  };

  const getProgressLabel = (goal: any, mode: "me" | "team") => {
    if (!goal.steps.length) return null;

    if (mode === "me" || getTeamMemberCount(goal) <= 1) {
      const { total, completed } = getStepStats(goal, "me");

      return mode === "me"
        ? `${completed} of ${total} steps completed by you`
        : `${completed} of ${total} steps completed by team`;
    }

    const totalSteps = goal.steps.length;
    const teamSize = getTeamMemberCount(goal);
    const { completed: actualCompletions } = getStepStats(goal, "team");
    const remaining = totalSteps * teamSize - actualCompletions;

    if (goal.deadline_type === "date" && goal.deadline_date) {
      if (isOverdue(goal)) return "Overdue";
      return `${actualCompletions} of ${totalSteps * teamSize} team completions`;
    }

    if (goal.deadline_type === "daily") {
      return remaining === 0
        ? "All done for today 🎉"
        : `${remaining} team completions left today`;
    }

    if (goal.deadline_type === "every_n_days" && goal.deadline_interval) {
      return `Due every ${goal.deadline_interval} days`;
    }

    return `${actualCompletions} of ${totalSteps * teamSize} team completions`;
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

  const toggleStepCompletion = async (stepId: number, completed: boolean) => {
    if (!user) return;

    if (completed) {
      await supabase.from("goal_step_progress").upsert({
        goal_step_id: stepId,
        user_id: user.id,
        completed_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("goal_step_progress")
        .delete()
        .eq("goal_step_id", stepId)
        .eq("user_id", user.id);
    }
  };

  const getFileInfo = (url: string) => {
    const filename = url.split("/").pop() || "attachment";
    const extension = filename.split(".").pop()?.toLowerCase() || "";

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
    const videoExtensions = ["mp4", "webm", "mov", "avi", "mkv"];
    const audioExtensions = ["mp3", "wav", "ogg", "m4a"];
    const documentExtensions = ["pdf", "doc", "docx", "txt", "md"];

    if (imageExtensions.includes(extension)) {
      return { type: "image", extension, filename };
    } else if (videoExtensions.includes(extension)) {
      return { type: "video", extension, filename };
    } else if (audioExtensions.includes(extension)) {
      return { type: "audio", extension, filename };
    } else if (documentExtensions.includes(extension)) {
      return { type: "document", extension, filename };
    } else {
      return { type: "file", extension, filename };
    }
  };

  const goalStatusColor = {
    overdue: "text-red-400",
    completed: "text-green-400",
    active: "text-gray-400",
  };

  const getGoalStatusForViewer = (
    goal: any,
    mode: "me" | "team",
    userId?: string,
  ): GoalStatus => {
    const now = new Date();

    let isPastDeadline = false;
    if (goal.deadline_type === "date" && goal.deadline_date) {
      const deadline = new Date(goal.deadline_date);
      deadline.setHours(23, 59, 59, 999);
      isPastDeadline = now > deadline;
    }

    const completedByMe = goal.steps.every((step: any) =>
      step.progress?.some((p: any) => p.user_id === userId),
    );

    const completedByAnyone = goal.steps.every(
      (step: any) => step.progress?.length > 0,
    );

    if (mode === "me") {
      if (completedByMe) return "completed";
      if (isPastDeadline) return "overdue";
      return "active";
    }

    if (mode === "team") {
      const { total, completed } = getStepStats(goal, "team");

      if (completed === total && total > 0) return "completed";
      if (isPastDeadline) return "overdue";
      return "active";
    }

    if (completedByAnyone) return "completed";
    if (isPastDeadline) return "overdue";
    return "active";
  };

  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<number, boolean>
  >({});

  const toggleDescription = (goalId: string) => {
    setExpandedDescriptions((prev: any) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  return (
    <AnimatePresence>
      <div className="min-h-screen px-4 relative pb-20">
        <Header />
        {isGoalModalOpen && <GoalModal />}

        {openTagCreateModal && (
          <div>
            <TagCreateForm
              onSuccess={() => {
                fetchTags();
                setOpenTagCreateModal(false);
              }}
              open={openTagCreateModal}
              onClose={() => {
                setOpenTagCreateModal(false);
              }}
            />
          </div>
        )}

        <div className="flex items-start gap-2 mb-4 w-full lg:justify-center justify-start overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedTagFilter(null)}
            className={`
      px-3 py-1 text-xs rounded-full border transition
      ${
        selectedTagFilter === null
          ? "bg-green-500/20 border-green-500 text-green-400"
          : "bg-[#2a2a2b] border-transparent text-gray-400"
      }
    `}
          >
            All
          </button>

          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() =>
                setSelectedTagFilter(
                  selectedTagFilter === tag.id ? null : tag.id,
                )
              }
              className={`
        px-3 py-1 text-xs w-fit min-w-fit rounded-full border transition
        ${
          selectedTagFilter === tag.id
            ? "bg-green-500/20 border-green-500 text-green-400"
            : "bg-[#2a2a2b] border-transparent text-gray-400"
        }
      `}
            >
              {tag.name}
            </button>
          ))}

          <button
            onClick={() => setOpenTagCreateModal(true)}
            className="px-4 py-[6px] text-xs rounded-full bg-blue-500/20 text-blue-400"
          >
            +
          </button>
        </div>
        <div className="fixed bottom-3 right-3">
          <div onClick={openCreateGoal}></div>

          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={openCreateGoal}
            className="bg-[#58a94257] rounded-full w-10 h-10 flex justify-center items-center cursor-pointer"
          >
            <Plus size={18} color="#58A942" />
          </motion.button>
        </div>
        <div className="lg:w-170 mx-auto mt-0.5  w-full ">
          <div className="flex flex-col gap-3 w-full">
            {goals
              .filter((goal) => {
                if (!selectedTagFilter) return true;

                return goal.goal_tags?.some(
                  (gt: any) =>
                    gt.tag_id === selectedTagFilter && gt.user_id === user?.id,
                );
              })
              // eslint-disable-next-line react-hooks/refs
              .map((goal) => {
                const fileInfo = goal.image_url
                  ? getFileInfo(goal.image_url)
                  : null;
                const mode = getProgressMode(goal);
                const status = getGoalStatusForViewer(goal, mode, user?.id);

                return (
                  <div
                    key={goal.id}
                    className=" p-3 rounded-xl bg-[#1a1a1b]  transition-all duration-300"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className="flex items-center gap-1 text-xs py-1 text-gray-400"
                        dangerouslySetInnerHTML={{
                          __html: formatDate(goal.created_at),
                        }}
                      ></div>

                      <div className="flex gap-1 items-center">
                        <div
                          className="text-xs py-1 rounded-lg px-1"
                          style={{
                            color: getDeadlineColor(goal),
                            backgroundColor: getDeadlineBgColor(goal),
                          }}
                        >
                          {formatDeadline(goal)}
                        </div>
                        {goal.goal_members && (
                          <div className="flex items-center gap-1">
                            {goal.goal_members.length > 1 ||
                            goal.user_id !== user?.id ? (
                              <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs py-1 px-2 rounded-full cursor-help">
                                      <Send size={12} />
                                      <span>Shared</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    className="p-2 dark:bg-[#1a1a1b] bg-white shadow border-[#3a3a3b] mr-4"
                                  >
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium text-gray-300 pb-2">
                                        Members & Roles
                                      </p>

                                      {goal.goal_members.map((member: any) => (
                                        <div
                                          key={member.id}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            {member.users?.avatar_url ? (
                                              <img
                                                src={member.users.avatar_url}
                                                alt={member.users.email}
                                                className="w-5 h-5 rounded-full"
                                              />
                                            ) : (
                                              <div className="w-5 h-5 rounded-full bg-[#3a3a3b] flex items-center justify-center text-[10px] text-gray-400">
                                                {member.users.full_name
                                                  ? member.users.full_name
                                                  : member.users?.email
                                                      ?.charAt(0)
                                                      .toUpperCase()}
                                              </div>
                                            )}
                                            <span className="text-gray-200">
                                              {member.users.full_name === null
                                                ? member.users?.email
                                                    ?.charAt(0)
                                                    .toUpperCase()
                                                : member.users.full_name}
                                            </span>
                                          </div>
                                          <span
                                            className={`
                                                px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize
                                                ${member.role === "owner" ? "bg-yellow-500/20 text-yellow-400" : ""}
                                                ${member.role === "editor" ? "bg-green-500/20 text-green-400" : ""}
                                                ${member.role === "viewer" ? "bg-blue-500/20 text-blue-400" : ""}
                                              `}
                                          >
                                            {member.role}
                                          </span>
                                        </div>
                                      ))}

                                      {goal.goal_members?.find(
                                        (member: any) =>
                                          member.user_id === user?.id,
                                      )?.role === "owner" && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setManageMembersGoal(goal);
                                          }}
                                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-500/20 cursor-pointer"
                                        >
                                          <SquarePen size={10} />
                                          <span>Manage</span>
                                        </button>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <></>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between flex-col">
                      <div className="">
                        <h3 className="text-base font-bold tracking-tight">
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <div className="text-xs">
                            <p
                              //@ts-ignore
                              ref={(el) =>
                                //@ts-ignore
                                (descriptionRefs.current[goal.id] = el)
                              }
                              className={
                                //@ts-ignore
                                expandedDescriptions[goal.id]
                                  ? ""
                                  : "line-clamp-1"
                              }
                            >
                              {goal.description}
                            </p>

                            {isOverflowing(
                              //@ts-ignore
                              // eslint-disable-next-line no-unexpected-multiline
                              goal.id,
                            ) && (
                              <button
                                onClick={() => toggleDescription(goal.id)}
                                className="text-[#58A942] hover:text-[#6bbf54] text-xs mt-1 focus:outline-none"
                              >
                                {
                                  //@ts-ignore
                                  expandedDescriptions[goal.id]
                                    ? "Show less"
                                    : "Show more"
                                }
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        {goal?.steps?.length > 0 && (
                          <div className="mt-6 space-y-1">
                            <div className="flex gap-1 mb-2">
                              <button
                                onClick={() => setProgressMode(goal.id, "me")}
                                className={`text-xs px-2 py-0.5 rounded-full transition ${
                                  getProgressMode(goal) === "me"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-[#2a2a2b] text-gray-400"
                                }`}
                              >
                                My Progress
                              </button>

                              {goal.goal_members.length > 1 ||
                              goal.user_id !== user?.id ? (
                                <button
                                  onClick={() =>
                                    setProgressMode(goal.id, "team")
                                  }
                                  className={`text-xs px-2 py-0.5 rounded-full transition ${
                                    getProgressMode(goal) === "team"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-[#2a2a2b] text-gray-400"
                                  }`}
                                >
                                  Team Progress
                                </button>
                              ) : (
                                <></>
                              )}
                            </div>

                            <div className="flex justify-between text-xs text-gray-400">
                              <span className={goalStatusColor[status]}>
                                {getProgressLabel(goal, mode)}
                              </span>

                              {goal.deadline_type !== "daily" && (
                                <span>{getProgressPercent(goal, mode)}%</span>
                              )}
                            </div>

                            <div className="h-1 w-full rounded-full bg-[#2a2a2b] overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  status === "overdue"
                                    ? "bg-red-500"
                                    : status === "completed"
                                      ? "bg-green-500"
                                      : "bg-[#58A942]"
                                }`}
                                style={{
                                  width: `${getProgressPercent(goal, mode)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`flex items-center  pt-4 ${goal.image_url ? "justify-between" : "justify-end"}`}
                    >
                      {goal.image_url && (
                        <div
                          className="cursor-pointer"
                          onClick={() =>
                            toggleAttachment(goal.id as unknown as number)
                          }
                        >
                          <Paperclip size={12} />
                        </div>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="rounded-lg border w-fit h-fit px-1 py-0.5 cursor-pointer">
                            <Ellipsis size={18} />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-40 mr-1"
                          align="start"
                        >
                          <DropdownMenuGroup>
                            {goal.goal_members?.find(
                              (member: any) => member.user_id === user?.id,
                            )?.role !== "viewer" && (
                              <DropdownMenuItem
                                onClick={() => openEditGoal(goal)}
                              >
                                Edit
                                <DropdownMenuShortcut>
                                  <SquarePen size={10} />
                                </DropdownMenuShortcut>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => setOpenTagAttachGoal(goal)}
                            >
                              Tags
                              <DropdownMenuShortcut>
                                {" "}
                                <Tag size={10} />
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>

                            {goal.goal_members?.find(
                              (member: any) => member.user_id === user?.id,
                            )?.role === "owner" && (
                              <DropdownMenuItem
                                onClick={() => setShareGoal(goal)}
                              >
                                Share
                                <DropdownMenuShortcut>
                                  <Send size={10} />
                                </DropdownMenuShortcut>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() =>
                                toggleSteps(goal.id as unknown as number)
                              }
                            >
                              Steps
                              <DropdownMenuShortcut>
                                <ListChecks size={10} />
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>

                            {goal.goal_members?.find(
                              (member: any) => member.user_id === user?.id,
                            )?.role === "owner" && (
                              <DropdownMenuItem
                                onClick={() => deleteGoal(goal.id)}
                              >
                                Delete
                                <DropdownMenuShortcut>
                                  <Trash2 size={14} color="#ff6467" />
                                </DropdownMenuShortcut>
                              </DropdownMenuItem>
                            )}

                            {goal.goal_members?.find(
                              (member: any) => member.user_id === user?.id,
                            )?.role === "owner" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageMembersGoal(goal);
                                }}
                              >
                                Members
                                <DropdownMenuShortcut>
                                  <SquarePen size={10} />
                                </DropdownMenuShortcut>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {goal.goal_tags &&
                        goal.goal_tags
                          .filter((item) => item?.user_id === user?.id)
                          .map(
                            (item, index) =>
                              item.tags && (
                                <motion.div
                                  key={`${item.tag_id}-${index}`}
                                  whileHover={{ scale: 1.02 }}
                                  className="inline-flex items-center gap-1 px-1.5 py-[.5px] bg-[#2a2a2b] rounded-lg border border-[#3a3a3b]"
                                >
                                  <span className="text-green-400">#</span>
                                  <span className="text-xs text-gray-300">
                                    {item.tags.name}
                                  </span>
                                </motion.div>
                              ),
                          )}
                    </div>
                    {manageMembersGoal && (
                      <ManageMembersModal
                        goal={manageMembersGoal}
                        onClose={() => setManageMembersGoal(null)}
                      />
                    )}

                    <Steps
                      openStepsGoalId={openStepsGoalId}
                      goal={goal}
                      toggleStepCompletion={toggleStepCompletion}
                    />
                    <Attachment
                      openAttachmentGoalId={openAttachmentGoalId}
                      goal={goal}
                      fileInfo={fileInfo}
                      setOpenAttachmentGoalId={setOpenAttachmentGoalId}
                    />
                    {shareGoal && (
                      <ShareGoalModal
                        goal={shareGoal}
                        onClose={() => setShareGoal(null)}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {openTagAttachGoal && (
          <TagAttachModal
            open={true}
            goal={openTagAttachGoal}
            onClose={() => setOpenTagAttachGoal(null)}
          />
        )}
      </div>
    </AnimatePresence>
  );
};

export default Dashboard;
