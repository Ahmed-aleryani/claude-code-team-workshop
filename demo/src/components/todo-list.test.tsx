import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ListTodosQuery, Todo } from '../../shared/types';
import { TodoList, type TodoListProps } from './todo-list';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? 't1',
    userId: overrides.userId ?? 'u1',
    title: overrides.title ?? 'item title',
    completed: overrides.completed ?? false,
    dueAt: overrides.dueAt ?? null,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function defaultProps(overrides: Partial<TodoListProps> = {}): TodoListProps {
  return {
    todos: [],
    query: { sort: 'createdAt-desc' },
    onQueryChange: vi.fn(),
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe('<TodoList /> — controls', () => {
  const FIXED_NOW = new Date('2026-05-09T12:00:00.000Z');
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'UTC';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  });

  it('renders all four filter pills with the active one pressed (overdue)', () => {
    render(<TodoList {...defaultProps({ query: { sort: 'createdAt-desc', to: FIXED_NOW.toISOString() } })} />);
    expect(screen.getByRole('button', { name: /^overdue$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^all$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^today$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^this week$/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks "All" pill active when no from/to set', () => {
    render(<TodoList {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /^all$/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking Overdue calls onQueryChange with to=<now> and no from', async () => {
    const onQueryChange = vi.fn<(q: ListTodosQuery) => void>();
    const user = userEvent.setup();
    render(<TodoList {...defaultProps({ onQueryChange })} />);

    await user.click(screen.getByRole('button', { name: /^overdue$/i }));

    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith({
      sort: 'createdAt-desc',
      to: '2026-05-09T12:00:00.000Z',
    });
  });

  it('clicking This week calls onQueryChange with from=now and to=now+7d', async () => {
    const onQueryChange = vi.fn<(q: ListTodosQuery) => void>();
    const user = userEvent.setup();
    render(<TodoList {...defaultProps({ onQueryChange })} />);

    await user.click(screen.getByRole('button', { name: /^this week$/i }));

    expect(onQueryChange).toHaveBeenCalledWith({
      sort: 'createdAt-desc',
      from: '2026-05-09T12:00:00.000Z',
      to: '2026-05-16T12:00:00.000Z',
    });
  });

  it('clicking Today calls onQueryChange with start-of-today and start-of-tomorrow in UTC', async () => {
    const onQueryChange = vi.fn<(q: ListTodosQuery) => void>();
    const user = userEvent.setup();
    render(<TodoList {...defaultProps({ onQueryChange })} />);

    await user.click(screen.getByRole('button', { name: /^today$/i }));

    expect(onQueryChange).toHaveBeenCalledWith({
      sort: 'createdAt-desc',
      from: '2026-05-09T00:00:00.000Z',
      to: '2026-05-10T00:00:00.000Z',
    });
  });

  it('clicking All calls onQueryChange with sort only (no from/to)', async () => {
    const onQueryChange = vi.fn<(q: ListTodosQuery) => void>();
    const user = userEvent.setup();
    render(
      <TodoList
        {...defaultProps({
          query: { sort: 'createdAt-desc', to: '2026-05-09T12:00:00.000Z' },
          onQueryChange,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^all$/i }));

    expect(onQueryChange).toHaveBeenCalledWith({ sort: 'createdAt-desc' });
  });

  it('changing the sort select calls onQueryChange with sort updated and the rest preserved', async () => {
    const onQueryChange = vi.fn<(q: ListTodosQuery) => void>();
    const user = userEvent.setup();
    render(
      <TodoList
        {...defaultProps({
          query: { sort: 'createdAt-desc', to: '2026-05-09T12:00:00.000Z' },
          onQueryChange,
        })}
      />,
    );

    const select = screen.getByLabelText(/^sort$/i) as HTMLSelectElement;
    await user.selectOptions(select, 'dueAt-asc');

    expect(onQueryChange).toHaveBeenCalledWith({
      sort: 'dueAt-asc',
      to: '2026-05-09T12:00:00.000Z',
    });
  });

  it('renders the empty state when todos is empty and no filter is active', () => {
    render(<TodoList {...defaultProps()} />);
    expect(screen.getByText(/no todos yet/i)).toBeInTheDocument();
  });

  it('renders the filter-empty state when todos is empty and a filter is active', () => {
    render(
      <TodoList
        {...defaultProps({
          query: { sort: 'createdAt-desc', to: '2026-05-09T12:00:00.000Z' },
        })}
      />,
    );
    expect(screen.getByText(/no todos match this filter/i)).toBeInTheDocument();
  });

  it('renders one item per todo when todos exist', () => {
    render(
      <TodoList
        {...defaultProps({
          todos: [
            makeTodo({ id: 't1', title: 'first' }),
            makeTodo({ id: 't2', title: 'second' }),
          ],
        })}
      />,
    );
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });
});
