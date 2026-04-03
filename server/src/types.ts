export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  list_id: string;
  parent_id: string | null;
  title: string;
  notes: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
  priority: number;
  recurrence: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}
