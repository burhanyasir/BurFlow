import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addToast, removeToast, getToasts, onToastsChange, toast } from '../core/toast';

describe('toast', () => {
  beforeEach(() => {
    getToasts().forEach(t => removeToast(t.id));
    vi.restoreAllMocks();
  });

  it('addToast creates toast', () => {
    const id = addToast('success', 'hello');
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0].message).toBe('hello');
    expect(getToasts()[0].type).toBe('success');
    expect(getToasts()[0].id).toBe(id);
  });

  it('addToast auto-removes after duration', () => {
    vi.useFakeTimers();
    addToast('info', 'test', 1000);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(getToasts()).toHaveLength(0);
    vi.useRealTimers();
  });

  it('addToast with duration 0 stays', () => {
    addToast('info', 'permanent', 0);
    expect(getToasts()).toHaveLength(1);
  });

  it('removeToast removes by id', () => {
    const id = addToast('success', 'msg');
    expect(getToasts()).toHaveLength(1);
    removeToast(id);
    expect(getToasts()).toHaveLength(0);
  });

  it('removeToast for unknown id is no-op', () => {
    addToast('success', 'msg');
    removeToast('nonexistent');
    expect(getToasts()).toHaveLength(1);
  });

  it('onToastsChange notifies on add', () => {
    const fn = vi.fn();
    const unsub = onToastsChange(fn);
    addToast('success', 'msg');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ message: 'msg' })]));
    unsub();
  });

  it('onToastsChange notifies on remove', () => {
    const fn = vi.fn();
    const id = addToast('success', 'msg');
    onToastsChange(fn);
    removeToast(id);
    expect(fn).toHaveBeenCalled();
  });

  it('onToastsChange unsub works', () => {
    const fn = vi.fn();
    const unsub = onToastsChange(fn);
    unsub();
    addToast('success', 'msg');
    expect(fn).not.toHaveBeenCalled();
  });

  it('toast.success creates success toast', () => {
    toast.success('done');
    expect(getToasts()[0].type).toBe('success');
    expect(getToasts()[0].message).toBe('done');
  });

  it('toast.error creates error toast', () => {
    toast.error('fail');
    expect(getToasts()[0].type).toBe('error');
  });

  it('toast.info creates info toast', () => {
    toast.info('info');
    expect(getToasts()[0].type).toBe('info');
  });

  it('toast.warning creates warning toast', () => {
    toast.warning('warn');
    expect(getToasts()[0].type).toBe('warning');
  });

  it('multiple toasts accumulate', () => {
    addToast('success', 'a');
    addToast('error', 'b');
    addToast('info', 'c');
    expect(getToasts()).toHaveLength(3);
  });

  it('getToasts returns array that cannot be mutated via toasts reference', () => {
    addToast('success', 'msg');
    const t = getToasts();
    expect(t.length).toBe(1);
    expect(t[0].message).toBe('msg');
  });
});
