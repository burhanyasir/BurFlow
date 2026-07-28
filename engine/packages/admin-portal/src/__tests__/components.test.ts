/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Table, TableColumn } from '../components/table';
import { Modal } from '../components/modal';
import { ProgressBar, Badge, StatusBadge, RoleBadge } from '../components/ui-components';

describe('Table', () => {
  let container: HTMLElement;
  beforeEach(() => { container = document.createElement('div'); });

  it('renders headers', () => {
    const t = new Table({ columns: [{ key: 'name', label: 'Name' }, { key: 'age', label: 'Age' }], data: [] });
    t.mount(container);
    const ths = container.querySelectorAll('th');
    expect(ths.length).toBe(2);
    expect(ths[0].textContent).toBe('Name');
    expect(ths[1].textContent).toBe('Age');
    t.unmount();
  });

  it('renders data rows', () => {
    const t = new Table({ columns: [{ key: 'name', label: 'Name' }], data: [{ name: 'Alice' }, { name: 'Bob' }] });
    t.mount(container);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toBe('Alice');
    expect(rows[1].textContent).toBe('Bob');
    t.unmount();
  });

  it('shows empty message when no data', () => {
    const t = new Table({ columns: [{ key: 'x', label: 'X' }], data: [], emptyMessage: 'No items found' });
    t.mount(container);
    expect(container.textContent).toContain('No items found');
    t.unmount();
  });

  it('onRowClick fires on row click', () => {
    const fn = vi.fn();
    const t = new Table({ columns: [{ key: 'n', label: 'N' }], data: [{ n: 1 }], onRowClick: fn });
    t.mount(container);
    const tr = container.querySelector('tbody tr')!;
    tr.click();
    expect(fn).toHaveBeenCalledWith({ n: 1 });
    t.unmount();
  });

  it('custom render function works (string)', () => {
    const t = new Table({
      columns: [{ key: 'val', label: 'V', render: (v: number) => `val=${v}` }],
      data: [{ val: 42 }],
    });
    t.mount(container);
    expect(container.textContent).toContain('val=42');
    t.unmount();
  });

  it('render returns HTMLElement', () => {
    const badge = document.createElement('span');
    badge.textContent = 'custom';
    const t = new Table({
      columns: [{ key: 'x', label: 'X', render: () => badge }],
      data: [{ x: 1 }],
    });
    t.mount(container);
    expect(container.querySelector('span')?.textContent).toBe('custom');
    t.unmount();
  });

  it('updateData re-renders', () => {
    const t = new Table({ columns: [{ key: 'v', label: 'V' }], data: [{ v: 1 }] });
    t.mount(container);
    expect(container.querySelector('tbody tr')?.textContent).toBe('1');
    t.updateData([{ v: 2 }, { v: 3 }]);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toBe('2');
    t.unmount();
  });

  it('testId is set on element', () => {
    const t = new Table({ columns: [], data: [], testId: 'my-table' });
    t.mount(container);
    expect(t.getElement().getAttribute('data-testid')).toBe('my-table');
    t.unmount();
  });

  it('column width is applied', () => {
    const t = new Table({ columns: [{ key: 'w', label: 'W', width: '100px' }], data: [] });
    t.mount(container);
    const th = container.querySelector('th')!;
    expect(th.style.width).toBe('100px');
    t.unmount();
  });

  it('column align is applied', () => {
    const t = new Table({ columns: [{ key: 'a', label: 'A', align: 'right' }], data: [{ a: 1 }] });
    t.mount(container);
    const th = container.querySelector('th')!;
    expect(th.style.textAlign).toBe('right');
    const td = container.querySelector('td')!;
    expect(td.style.textAlign).toBe('right');
    t.unmount();
  });
});

describe('Modal', () => {
  it('open renders modal in body', () => {
    const modal = new Modal({ title: 'Test', content: 'Hello' });
    modal.open();
    expect(document.body.querySelector('[data-testid="modal-backdrop"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Test');
    expect(document.body.textContent).toContain('Hello');
    modal.close();
  });

  it('close removes modal', () => {
    const modal = new Modal({ title: 'Test', content: 'Hi' });
    modal.open();
    modal.close();
    expect(document.body.querySelector('.modal-backdrop')).toBeFalsy();
  });

  it('close button works', () => {
    const modal = new Modal({ title: 'T', content: 'C' });
    modal.open();
    const closeBtn = document.querySelector('.modal-close') as HTMLElement;
    closeBtn.click();
    expect(document.body.querySelector('.modal-backdrop')).toBeFalsy();
  });

  it('backdrop click closes modal', () => {
    const modal = new Modal({ title: 'T', content: 'C' });
    modal.open();
    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement;
    backdrop.click(new MouseEvent('click', { bubbles: true }));
    expect(document.body.querySelector('.modal-backdrop')).toBeFalsy();
  });

  it('actions render and click works', () => {
    const fn = vi.fn();
    const modal = new Modal({
      title: 'T', content: 'C',
      actions: [{ label: 'OK', onClick: fn, variant: 'primary' }],
    });
    modal.open();
    const btns = document.querySelectorAll('.modal-footer button');
    expect(btns.length).toBe(1);
    expect(btns[0].textContent).toBe('OK');
    (btns[0] as HTMLElement).click();
    expect(fn).toHaveBeenCalled();
    expect(document.body.querySelector('.modal-backdrop')).toBeFalsy();
  });

  it('onClose callback fires', () => {
    const fn = vi.fn();
    const modal = new Modal({ title: 'T', content: 'C', onClose: fn });
    modal.open();
    modal.close();
    expect(fn).toHaveBeenCalled();
  });

  it('content can be HTMLElement', () => {
    const div = document.createElement('div');
    div.textContent = 'Dynamic content';
    const modal = new Modal({ title: 'T', content: div });
    modal.open();
    expect(document.body.textContent).toContain('Dynamic content');
    modal.close();
  });

  it('escape key closes modal', () => {
    const modal = new Modal({ title: 'T', content: 'C' });
    modal.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.body.querySelector('.modal-backdrop')).toBeFalsy();
  });
});

describe('ProgressBar', () => {
  let container: HTMLElement;
  beforeEach(() => { container = document.createElement('div'); });

  it('renders with value and max', () => {
    const pb = new ProgressBar(50, 100, 'Progress');
    pb.mount(container);
    expect(container.textContent).toContain('50%');
    expect(container.textContent).toContain('Progress');
    pb.unmount();
  });

  it('fills to correct percentage', () => {
    const pb = new ProgressBar(75, 100);
    pb.mount(container);
    const fill = container.querySelector('[data-testid="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('75%');
    pb.unmount();
  });

  it('update changes value', () => {
    const pb = new ProgressBar(10, 100);
    pb.mount(container);
    pb.update(90);
    const fill = container.querySelector('[data-testid="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('90%');
    pb.unmount();
  });

  it('hides percent when showPercent is false', () => {
    const pb = new ProgressBar(50, 100, 'Label', false);
    pb.mount(container);
    expect(container.textContent).toContain('Label');
    expect(container.textContent).not.toContain('50%');
    pb.unmount();
  });

  it('caps at 100%', () => {
    const pb = new ProgressBar(200, 100);
    pb.mount(container);
    const fill = container.querySelector('[data-testid="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
    pb.unmount();
  });

  it('zero max renders 0% fill width', () => {
    const pb = new ProgressBar(0, 0, 'Empty');
    pb.mount(container);
    expect(container.textContent).toContain('0%');
    const fill = container.querySelector('[data-testid="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('0%');
    pb.unmount();
  });
});

describe('Badge', () => {
  let container: HTMLElement;
  beforeEach(() => { container = document.createElement('div'); });

  it('renders text', () => {
    const b = new Badge('Active', 'success');
    b.mount(container);
    expect(container.textContent).toBe('Active');
    b.unmount();
  });

  it('applies variant class', () => {
    const b = new Badge('X', 'error');
    b.mount(container);
    expect(b.getElement().className).toContain('badge-error');
    b.unmount();
  });

  it('updateText changes text', () => {
    const b = new Badge('old');
    b.mount(container);
    b.updateText('new');
    expect(container.textContent).toBe('new');
    b.unmount();
  });

  it('default variant is "default"', () => {
    const b = new Badge('D');
    b.mount(container);
    expect(b.getElement().className).toContain('badge-default');
    b.unmount();
  });
});

describe('StatusBadge', () => {
  let container: HTMLElement;
  beforeEach(() => { container = document.createElement('div'); });

  it('maps active to success', () => {
    const b = StatusBadge({ status: 'active' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-success');
    expect(container.textContent).toBe('active');
    b.unmount();
  });

  it('maps failed to error', () => {
    const b = StatusBadge({ status: 'failed' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-error');
    b.unmount();
  });

  it('maps processing to info', () => {
    const b = StatusBadge({ status: 'processing' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-info');
    b.unmount();
  });

  it('maps ended to default', () => {
    const b = StatusBadge({ status: 'ended' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-default');
    b.unmount();
  });

  it('unknown status maps to default', () => {
    const b = StatusBadge({ status: 'unknown-status' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-default');
    b.unmount();
  });
});

describe('RoleBadge', () => {
  let container: HTMLElement;
  beforeEach(() => { container = document.createElement('div'); });

  it('maps owner to purple', () => {
    const b = RoleBadge({ role: 'owner' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-purple');
    b.unmount();
  });

  it('maps admin to error', () => {
    const b = RoleBadge({ role: 'admin' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-error');
    b.unmount();
  });

  it('maps member to info', () => {
    const b = RoleBadge({ role: 'member' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-info');
    b.unmount();
  });

  it('maps end-user to default', () => {
    const b = RoleBadge({ role: 'end-user' });
    b.mount(container);
    expect(b.getElement().className).toContain('badge-default');
    b.unmount();
  });
});
