export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  goal_tags: GoalTag[];

  // deadline stuff
  deadline_type: "date" | "daily" | "every_n_days";
  deadline_date: string | null;
  deadline_interval: number | null;
  image_url: string | null;
  // relations
  steps: GoalStep[];

  created_at: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goal_members: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any;
  attachments?: Attachment[];
  notes?: GoalNote[];
};

export type Tag = {
  id: string;
  name: string;
  is_system: boolean;
  created_at: string;
  created_by: string | null;
  user_id: string;
};

export type GoalTag = {
  tag_id: string;
  user_id: string | undefined;
  tags: Tag;
};

export type GoalStep = {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
};

export type Attachment = {
  id: string;
  goal_id: string;
  user_id: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
};

export type GoalNote = {
  id: string;
  goal_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};
