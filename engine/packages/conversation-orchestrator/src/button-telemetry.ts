export type ButtonEventType = 'shown' | 'clicked' | 'ignored' | 'conversion';

export interface ButtonEvent {
  type: ButtonEventType;
  sessionId?: string;
  turnNumber?: number;
  buttonId: string;
  label: string;
  category?: string;
  timestamp: number;
}

export class ButtonTelemetry {
  private events: ButtonEvent[] = [];
  private max = 10000;

  record(e: ButtonEvent) {
    this.events.push(e);
    if (this.events.length > this.max) this.events = this.events.slice(-this.max);
  }

  recordShown(buttonId: string, label: string, category?: string, sessionId?: string, turnNumber?: number) {
    this.record({ type: 'shown', buttonId, label, category, sessionId, turnNumber, timestamp: Date.now() });
  }

  recordClicked(buttonId: string, label: string, category?: string, sessionId?: string, turnNumber?: number) {
    this.record({ type: 'clicked', buttonId, label, category, sessionId, turnNumber, timestamp: Date.now() });
  }

  recordIgnored(buttonId: string, label: string, category?: string, sessionId?: string, turnNumber?: number) {
    this.record({ type: 'ignored', buttonId, label, category, sessionId, turnNumber, timestamp: Date.now() });
  }

  recordConversionAfterClick(buttonId: string, label: string, category?: string, sessionId?: string, turnNumber?: number) {
    this.record({ type: 'conversion', buttonId, label, category, sessionId, turnNumber, timestamp: Date.now() });
  }

  snapshot() {
    const shown = this.events.filter(e => e.type === 'shown');
    const clicked = this.events.filter(e => e.type === 'clicked');
    const ignored = this.events.filter(e => e.type === 'ignored');
    const conversions = this.events.filter(e => e.type === 'conversion');

    const byButton: Record<string, { shown: number; clicked: number; ignored: number; conversion: number; ctr: number; conversionAfterClick: number }> = {};
    for (const s of shown) {
      const id = s.buttonId;
      if (!byButton[id]) byButton[id] = { shown: 0, clicked: 0, ignored: 0, conversion: 0, ctr: 0, conversionAfterClick: 0 };
      byButton[id].shown++;
    }
    for (const c of clicked) {
      const id = c.buttonId;
      if (!byButton[id]) byButton[id] = { shown: 0, clicked: 0, ignored: 0, conversion: 0, ctr: 0, conversionAfterClick: 0 };
      byButton[id].clicked++;
    }
    for (const ig of ignored) {
      const id = ig.buttonId;
      if (!byButton[id]) byButton[id] = { shown: 0, clicked: 0, ignored: 0, conversion: 0, ctr: 0, conversionAfterClick: 0 };
      byButton[id].ignored++;
    }
    for (const c of conversions) {
      const id = c.buttonId;
      if (!byButton[id]) byButton[id] = { shown: 0, clicked: 0, ignored: 0, conversion: 0, ctr: 0, conversionAfterClick: 0 };
      byButton[id].conversion++;
    }
    for (const k of Object.keys(byButton)) {
      const rec = byButton[k];
      rec.ctr = rec.shown > 0 ? Math.round((rec.clicked / rec.shown) * 10000) / 100 : 0;
      rec.conversionAfterClick = rec.clicked > 0 ? Math.round((rec.conversion / rec.clicked) * 10000) / 100 : 0;
    }

    return { totalEvents: this.events.length, byButton };
  }

  recent(count = 50) { return this.events.slice(-count); }

  reset() { this.events = []; }
}

// Export a singleton for in-process telemetry collection. For production integrate with real telemetry backend.
export const buttonTelemetry = new ButtonTelemetry();
