import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoComposer } from './todo-composer';

describe('<TodoComposer />', () => {
  it('disables the Add button when input is empty', () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<TodoComposer onAdd={onAdd} />);
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });

  it('enables the Add button after typing and disables again after clearing', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TodoComposer onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(/what needs doing/i);
    const button = screen.getByRole('button', { name: /^add$/i });

    await user.type(input, 'something');
    expect(button).not.toBeDisabled();

    await user.clear(input);
    expect(button).toBeDisabled();
  });

  it('disables the Add button when input is whitespace only', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TodoComposer onAdd={onAdd} />);

    await user.type(screen.getByPlaceholderText(/what needs doing/i), '   ');
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });

  it('calls onAdd with trimmed title and dueAt: null when no date is given', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TodoComposer onAdd={onAdd} />);

    const input = screen.getByPlaceholderText(/what needs doing/i) as HTMLInputElement;
    await user.type(input, '  buy milk  ');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith({ title: 'buy milk', dueAt: null });
    await vi.waitFor(() => expect(input.value).toBe(''));
  });
});

describe('<TodoComposer /> — dueAt handling', () => {
  it('converts datetime-local value to a UTC ISO string whose local-tz parts match the input', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TodoComposer onAdd={onAdd} />);

    const titleInput = screen.getByPlaceholderText(/what needs doing/i) as HTMLInputElement;
    const dueInput = screen.getByLabelText(/due date and time/i) as HTMLInputElement;

    await user.type(titleInput, 'pay rent');
    await user.type(dueInput, '2026-06-15T17:00');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const call = onAdd.mock.calls[0]?.[0] as { title: string; dueAt: string | null };
    expect(call.title).toBe('pay rent');
    // TZ-agnostic structural check: ISO 8601 with Z suffix.
    expect(call.dueAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // Round-trip: the UTC instant, when read back in the runner's local TZ,
    // produces the exact wall-clock parts the user typed.
    const parsed = new Date(call.dueAt as string);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(5); // June (0-indexed)
    expect(parsed.getDate()).toBe(15);
    expect(parsed.getHours()).toBe(17);
    expect(parsed.getMinutes()).toBe(0);

    await vi.waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(dueInput.value).toBe('');
    });
  });

  it('omitting the date submits dueAt: null', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TodoComposer onAdd={onAdd} />);

    await user.type(screen.getByPlaceholderText(/what needs doing/i), 'no date');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onAdd).toHaveBeenCalledWith({ title: 'no date', dueAt: null });
  });
});
