import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from '../core/store';

describe('Store', () => {
  it('returns initial state', () => {
    const s = new Store({ count: 0, name: 'test' });
    expect(s.get('count')).toBe(0);
    expect(s.get('name')).toBe('test');
    expect(s.getAll()).toEqual({ count: 0, name: 'test' });
  });

  it('set updates value and notifies', () => {
    const s = new Store({ count: 0 });
    const fn = vi.fn();
    s.subscribe('count', fn);
    s.set('count', 5);
    expect(s.get('count')).toBe(5);
    expect(fn).toHaveBeenCalledWith(5, 0);
  });

  it('set without subscribers works', () => {
    const s = new Store({ count: 0 });
    s.set('count', 3);
    expect(s.get('count')).toBe(3);
  });

  it('update merges multiple keys', () => {
    const s = new Store({ a: 1, b: 2, c: 3 });
    const fnA = vi.fn();
    const fnB = vi.fn();
    s.subscribe('a', fnA);
    s.subscribe('b', fnB);
    s.update({ a: 10, b: 20 });
    expect(s.get('a')).toBe(10);
    expect(s.get('b')).toBe(20);
    expect(s.get('c')).toBe(3);
    expect(fnA).toHaveBeenCalledWith(10, 1);
    expect(fnB).toHaveBeenCalledWith(20, 2);
  });

  it('subscribe unsub works', () => {
    const s = new Store({ count: 0 });
    const fn = vi.fn();
    const unsub = s.subscribe('count', fn);
    s.set('count', 1);
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    s.set('count', 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('multiple subscribers notified', () => {
    const s = new Store({ count: 0 });
    const f1 = vi.fn();
    const f2 = vi.fn();
    s.subscribe('count', f1);
    s.subscribe('count', f2);
    s.set('count', 1);
    expect(f1).toHaveBeenCalledTimes(1);
    expect(f2).toHaveBeenCalledTimes(1);
  });

  it('onAny notifies on any change', () => {
    const s = new Store({ a: 0, b: 0 });
    const fn = vi.fn();
    s.onAny(fn);
    s.set('a', 1);
    s.set('b', 2);
    s.update({ a: 3, b: 4 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('onAny unsub works', () => {
    const s = new Store({ a: 0 });
    const fn = vi.fn();
    const unsub = s.onAny(fn);
    s.set('a', 1);
    unsub();
    s.set('a', 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('getAll returns current state snapshot', () => {
    const s = new Store({ a: 1 });
    const all = s.getAll();
    expect(all).toEqual({ a: 1 });
    s.set('a', 2);
    expect(s.get('a')).toBe(2);
  });
});
