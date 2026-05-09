import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from './use-now';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a Date matching the current system time on initial render', () => {
    const { result } = renderHook(() => useNow(60_000));
    expect(result.current).toBeInstanceOf(Date);
    expect(result.current.toISOString()).toBe('2026-05-09T12:00:00.000Z');
  });

  it('advances the returned Date when the interval elapses', () => {
    const { result } = renderHook(() => useNow(60_000));
    const before = result.current.getTime();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.getTime()).toBe(before + 60_000);
  });

  it('clears the interval on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useNow(60_000));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
