/**
 * Frozen API contract. Imported by both server/ and src/.
 * Any change here is a coordinated change across all three teammates.
 */

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export interface CreateTodoRequest {
  title: string;
  dueAt?: string | null;
}

export interface UpdateTodoRequest {
  title?: string;
  completed?: boolean;
  dueAt?: string | null;
}

export type SortOption = 'createdAt-desc' | 'dueAt-asc';

export interface ListTodosQuery {
  sort?: SortOption;
  from?: string;
  to?: string;
}

export type TodoListResponse = Todo[];

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}
