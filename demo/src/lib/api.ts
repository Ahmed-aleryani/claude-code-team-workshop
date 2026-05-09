import type {
  ApiError,
  AuthResponse,
  CreateTodoRequest,
  ListTodosQuery,
  LoginRequest,
  RegisterRequest,
  Todo,
  TodoListResponse,
  UpdateTodoRequest,
} from '../../shared/types';

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.error);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && init.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');
  const data: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const body: ApiError = isApiError(data)
      ? data
      : { error: typeof data === 'string' && data.length > 0 ? data : response.statusText };
    throw new ApiClientError(response.status, body);
  }

  return data as T;
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { error?: unknown };
  return typeof candidate.error === 'string';
}

export function register(input: RegisterRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' });
}

export async function me(): Promise<AuthResponse | null> {
  try {
    return await apiFetch<AuthResponse>('/api/auth/me');
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function listTodos(query: ListTodosQuery = {}): Promise<TodoListResponse> {
  const params = new URLSearchParams();
  if (query.sort) params.set('sort', query.sort);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const qs = params.toString();
  return apiFetch<TodoListResponse>(qs ? `/api/todos?${qs}` : '/api/todos');
}

export function createTodo(input: CreateTodoRequest): Promise<Todo> {
  return apiFetch<Todo>('/api/todos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTodo(id: string, input: UpdateTodoRequest): Promise<Todo> {
  return apiFetch<Todo>(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTodo(id: string): Promise<void> {
  return apiFetch<void>(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
