import { useEffect, useState } from 'react';
import type { CreateTodoRequest, ListTodosQuery, Todo } from '../../shared/types';
import * as api from '../lib/api';
import { ApiClientError } from '../lib/api';
import { ErrorBanner } from './error-banner';
import { TodoComposer } from './todo-composer';
import { TodoList } from './todo-list';

function describeError(error: unknown): string {
  if (error instanceof ApiClientError) return error.body.error;
  return 'Something went wrong. Please try again.';
}

const INITIAL_QUERY: ListTodosQuery = { sort: 'createdAt-desc' };

export function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<ListTodosQuery>(INITIAL_QUERY);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const initial = await api.listTodos(query);
        if (!cancelled) {
          setTodos(initial);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  async function handleAdd(input: CreateTodoRequest) {
    setError(null);
    try {
      const created = await api.createTodo(input);
      setTodos((prev) => [created, ...prev]);
    } catch (err) {
      setError(describeError(err));
      throw err;
    }
  }

  async function handleToggle(id: string, completed: boolean) {
    setError(null);
    const previous = todos;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    try {
      const updated = await api.updateTodo(id, { completed });
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setTodos(previous);
      setError(describeError(err));
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const previous = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTodo(id);
    } catch (err) {
      setTodos(previous);
      setError(describeError(err));
    }
  }

  return (
    <section className="todo-page" aria-labelledby="todo-page-title">
      <h2 id="todo-page-title" className="todo-page__title">
        Your todos
      </h2>
      <ErrorBanner error={error} />
      <TodoComposer onAdd={handleAdd} />
      {loading ? (
        <div className="loading" role="status" aria-live="polite">
          Loading…
        </div>
      ) : (
        <TodoList
          todos={todos}
          query={query}
          onQueryChange={setQuery}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
