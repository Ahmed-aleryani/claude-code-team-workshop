import type { Todo } from '../../shared/types';
import { useNow } from '../lib/use-now';

export interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

const dueDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const now = useNow(60_000);

  function handleDelete() {
    const confirmed = window.confirm(`Delete "${todo.title}"?`);
    if (confirmed) onDelete(todo.id);
  }

  const dueDate = todo.dueAt ? new Date(todo.dueAt) : null;
  const isOverdue = dueDate !== null && !todo.completed && dueDate.getTime() < now.getTime();
  const titleClass = todo.completed
    ? 'todo-item__title todo-item__title--completed'
    : 'todo-item__title';
  const dueClass = isOverdue ? 'todo-item__due todo-item__due--overdue' : 'todo-item__due';

  return (
    <li className="todo-item">
      <input
        className="todo-item__checkbox"
        type="checkbox"
        checked={todo.completed}
        onChange={(event) => onToggle(todo.id, event.target.checked)}
        aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <div className="todo-item__body">
        <span className={titleClass}>{todo.title}</span>
        {dueDate ? (
          <span
            className={dueClass}
            aria-label={isOverdue ? 'Overdue' : 'Due date'}
          >
            {isOverdue ? 'Overdue · ' : 'Due '}
            <time dateTime={todo.dueAt ?? undefined}>
              {dueDateFormatter.format(dueDate)}
            </time>
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="button button--danger"
        onClick={handleDelete}
        aria-label={`Delete "${todo.title}"`}
      >
        Delete
      </button>
    </li>
  );
}
