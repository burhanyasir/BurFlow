import { Component } from '../core/component';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T) => string | HTMLElement;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableOptions<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  testId?: string;
}

export class Table<T = any> extends Component {
  private options: TableOptions<T>;

  constructor(options: TableOptions<T>) {
    super('table');
    this.options = options;
    this.setClassName('admin-table');
    if (options.testId) this.setTestId(options.testId);
  }

  render(): void {
    this.el.innerHTML = '';
    const thead = this.createElement('thead');
    const headerRow = this.createElement('tr');
    this.options.columns.forEach(col => {
      const th = this.createElement('th', { scope: 'col' }, col.label);
      if (col.width) th.style.width = col.width;
      if (col.align) th.style.textAlign = col.align;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    this.el.appendChild(thead);

    const tbody = this.createElement('tbody');
    if (this.options.data.length === 0) {
      const tr = this.createElement('tr');
      const td = this.createElement('td', { colspan: String(this.options.columns.length) }, this.options.emptyMessage || 'No data');
      td.style.textAlign = 'center';
      td.style.padding = '24px';
      td.style.color = '#6b7280';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      this.options.data.forEach(row => {
        const tr = this.createElement('tr');
        if (this.options.onRowClick) {
          tr.style.cursor = 'pointer';
          this.on(tr, 'click', () => this.options.onRowClick!(row));
        }
        this.options.columns.forEach(col => {
          const td = this.createElement('td');
          const value = (row as any)[col.key];
          const rendered = col.render ? col.render(value, row) : String(value ?? '');
          if (typeof rendered === 'string') td.textContent = rendered;
          else td.appendChild(rendered);
          if (col.align) td.style.textAlign = col.align;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    this.el.appendChild(tbody);
  }

  updateData(data: T[]): void {
    this.options.data = data;
    this.render();
  }
}
