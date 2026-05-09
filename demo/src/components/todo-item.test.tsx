import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Todo } from '../../shared/types';
import { TodoItem } from './todo-item';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? 't1',
    userId: overrides.userId ?? 'u1',
    title: overrides.title ?? 'item title',
    completed: overrides.completed ?? false,
    dueAt: overrides.dueAt ?? null,
    createdAt: overrides.createdAt ?? 'now',
    updatedAt: overrides.updatedAt ?? 'now',
  };
}

type ConfirmSpy = MockInstance<typeof window.confirm>;

describe('<TodoItem />', () => {
  let confirmSpy: ConfirmSpy;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
  });
  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('checkbox click calls onToggle(id, !completed) — toggling false → true', async () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <ul>
        <TodoItem todo={makeTodo({ completed: false })} onToggle={onToggle} onDelete={onDelete} />
      </ul>,
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('t1', true);
  });

  it('checkbox click calls onToggle(id, !completed) — toggling true → false', async () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <ul>
        <TodoItem todo={makeTodo({ completed: true })} onToggle={onToggle} onDelete={onDelete} />
      </ul>,
    );

    await user.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('t1', false);
  });

  it('clicking Delete with confirm=true calls onDelete(id)', async () => {
    confirmSpy.mockReturnValue(true);
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <ul>
        <TodoItem todo={makeTodo()} onToggle={onToggle} onDelete={onDelete} />
      </ul>,
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('t1');
  });

  it('clicking Delete with confirm=false does not call onDelete', async () => {
    confirmSpy.mockReturnValue(false);
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <ul>
        <TodoItem todo={makeTodo()} onToggle={onToggle} onDelete={onDelete} />
      </ul>,
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe('<TodoItem /> — dueAt rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render any due-date span when dueAt is null', () => {
    render(
      <ul>
        <TodoItem
          todo={makeTodo({ dueAt: null })}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>,
    );
    expect(screen.queryByLabelText(/^due date$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^overdue$/i)).not.toBeInTheDocument();
  });

  it('renders a due-date span (not overdue) when dueAt is in the future', () => {
    render(
      <ul>
        <TodoItem
          todo={makeTodo({ dueAt: '2026-06-01T00:00:00.000Z', completed: false })}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>,
    );
    const span = screen.getByLabelText(/^due date$/i);
    expect(span).toBeInTheDocument();
    expect(span.className).not.toMatch(/overdue/);
  });

  it('applies the overdue class when dueAt < now and not completed', () => {
    render(
      <ul>
        <TodoItem
          todo={makeTodo({ dueAt: '2026-04-01T00:00:00.000Z', completed: false })}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>,
    );
    const span = screen.getByLabelText(/^overdue$/i);
    expect(span).toBeInTheDocument();
    expect(span.className).toMatch(/overdue/);
  });

  it('does NOT apply overdue class when the todo is completed (even if past due)', () => {
    render(
      <ul>
        <TodoItem
          todo={makeTodo({ dueAt: '2026-04-01T00:00:00.000Z', completed: true })}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>,
    );
    expect(screen.queryByLabelText(/^overdue$/i)).not.toBeInTheDocument();
    const span = screen.getByLabelText(/^due date$/i);
    expect(span.className).not.toMatch(/overdue/);
  });
});
