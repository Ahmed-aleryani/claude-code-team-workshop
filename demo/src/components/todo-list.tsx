import { useId } from 'react';
import type { ListTodosQuery, SortOption, Todo } from '../../shared/types';
import { TodoItem } from './todo-item';

type FilterPreset = 'all' | 'overdue' | 'today' | 'thisWeek';

export interface TodoListProps {
  todos: Todo[];
  query: ListTodosQuery;
  onQueryChange: (query: ListTodosQuery) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

const FILTERS: ReadonlyArray<{ value: FilterPreset; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This week' },
];

function detectFilterPreset(query: ListTodosQuery): FilterPreset {
  if (!query.from && !query.to) return 'all';
  if (!query.from && query.to) return 'overdue';
  if (query.from && query.to) {
    const span = new Date(query.to).getTime() - new Date(query.from).getTime();
    return span > 2 * 24 * 60 * 60 * 1000 ? 'thisWeek' : 'today';
  }
  return 'all';
}

function buildRangeForFilter(filter: FilterPreset): { from?: string; to?: string } {
  if (filter === 'all') return {};

  const now = new Date();
  if (filter === 'overdue') {
    return { to: now.toISOString() };
  }
  if (filter === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { from: now.toISOString(), to: end.toISOString() };
}

export function TodoList({
  todos,
  query,
  onQueryChange,
  onToggle,
  onDelete,
}: TodoListProps) {
  const sortId = useId();
  const sort: SortOption = query.sort ?? 'createdAt-desc';
  const activeFilter = detectFilterPreset(query);

  function handleSortChange(next: SortOption) {
    onQueryChange({ ...query, sort: next });
  }

  function handleFilterChange(next: FilterPreset) {
    const range = buildRangeForFilter(next);
    onQueryChange({ sort, ...range });
  }

  return (
    <div className="todo-list-wrapper">
      <div className="todo-list__controls">
        <div
          className="todo-list__filters"
          role="group"
          aria-label="Filter todos by due date"
        >
          {FILTERS.map((preset) => {
            const active = activeFilter === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                className={
                  active
                    ? 'todo-list__filter-pill todo-list__filter-pill--active'
                    : 'todo-list__filter-pill'
                }
                aria-pressed={active}
                onClick={() => handleFilterChange(preset.value)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="todo-list__sort">
          <label className="todo-list__sort-label" htmlFor={sortId}>
            Sort
          </label>
          <select
            id={sortId}
            className="todo-list__sort-select"
            value={sort}
            onChange={(event) => handleSortChange(event.target.value as SortOption)}
          >
            <option value="createdAt-desc">Newest first</option>
            <option value="dueAt-asc">Due soonest</option>
          </select>
        </div>
      </div>
      {todos.length === 0 ? (
        <p className="empty-state">
          {activeFilter === 'all'
            ? 'No todos yet. Add your first one above.'
            : 'No todos match this filter.'}
        </p>
      ) : (
        <ul className="todo-list" role="list" aria-label="Todo items">
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
