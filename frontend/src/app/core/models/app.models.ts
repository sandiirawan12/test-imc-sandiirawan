export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  password?: string;
  level_id: number;
  level_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Level {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  user_count?: number;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PageMenu {
  id: number;
  name: string;
  path: string;
  icon?: string;
  description?: string | null;
  sort_order: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPermissionItem {
  page_id: number;
  page_name: string;
  path: string;
  level_allowed: boolean;
  override: boolean | null; // true = granted, false = denied, null = inherit
  effective_allowed: boolean;
  status_label: string;
}

export interface PermissionMatrix {
  levels: Level[];
  pages: PageMenu[];
  users: User[];
  level_permissions: { level_id: number; page_id: number }[];
  user_permissions: { user_id: number; page_id: number; is_allowed: boolean }[];
}

export interface LoginResponseData {
  token: string;
  user: User;
  accessible_pages: PageMenu[];
}

