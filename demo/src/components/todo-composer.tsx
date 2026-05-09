import { useId, useState, type FormEvent } from 'react';
import { createTodoSchema } from '../../shared/schemas';
import type { CreateTodoRequest } from '../../shared/types';

export interface TodoComposerProps {
  onAdd: (input: CreateTodoRequest) => Promise<void>;
}

export function TodoComposer({ onAdd }: TodoComposerProps) {
  const titleInputId = useId();
  const dueInputId = useId();
  const errorId = `${titleInputId}-error`;
  const [title, setTitle] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    let dueAt: string | null = null;
    if (dueLocal) {
      const parsedDate = new Date(dueLocal);
      if (Number.isNaN(parsedDate.getTime())) {
        setError('Due date is invalid');
        return;
      }
      dueAt = parsedDate.toISOString();
    }

    const parsed = createTodoSchema.safeParse({ title, dueAt });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setPending(true);
    try {
      await onAdd({ title: parsed.data.title, dueAt: parsed.data.dueAt ?? null });
      setTitle('');
      setDueLocal('');
    } catch {
      // surfaced to caller via its own error state — composer stays usable
    } finally {
      setPending(false);
    }
  }

  const trimmed = title.trim();
  const submitDisabled = pending || trimmed.length === 0;

  return (
    <form className="todo-composer" onSubmit={handleSubmit} noValidate>
      <label className="visually-hidden" htmlFor={titleInputId}>
        New todo title
      </label>
      <input
        id={titleInputId}
        className="form-input todo-composer__input"
        type="text"
        name="title"
        placeholder="What needs doing?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        maxLength={500}
      />
      <label className="visually-hidden" htmlFor={dueInputId}>
        Due date and time
      </label>
      <input
        id={dueInputId}
        className="form-input todo-composer__due"
        type="datetime-local"
        name="dueAt"
        value={dueLocal}
        onChange={(event) => setDueLocal(event.target.value)}
      />
      <button type="submit" className="button" disabled={submitDisabled}>
        {pending ? 'Adding…' : 'Add'}
      </button>
      {error ? (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
