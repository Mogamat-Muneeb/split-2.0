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



export interface Set {
  id: string;
  set_number: number;
  weight: number;
  reps?: number;
  rep_range_min?: number;
  rep_range_max?: number;
  checked?: boolean
}

export interface WorkoutExercise {
  id: string;
  exercise_id: string;
  name: string;
  notes: string;
  rest_timer: string;
  position: number;
  sets: Set[];
  exercise_image?: string;
  order_index?: string;
}

export interface Workout {
  id: string;
  name: string;
  created_at: string;
  exercises: WorkoutExercise[];
  workout_exercises?: WorkoutExercise[];
}


export interface ActiveWorkout {
  id?: string;
  workoutId?: string;
  name: string;
  startedAt: Date;
  exercises: WorkoutExercise[];
}

export interface ExerciseJsonContent {
  [key: string]: any;
}

export interface Exercise {
  folder: string;
  images: string[];
  jsonContents: ExerciseJsonContent[];
}

export interface Set {
  weight: number;
  repType: "reps" | "repRange";
  reps?: number;
  repRangeMin?: number;
  repRangeMax?: number;
}

export interface WorkoutExercise {
  exercise: Exercise;
  notes: string;
  restTimer: string;
  sets: Set[];
}