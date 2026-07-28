import { Component } from '../core/component';

interface EmptyStateConfig {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionTestId?: string;
  secondaryText?: string;
}

export class EmptyState extends Component {
  private config: EmptyStateConfig;

  constructor(config: EmptyStateConfig) {
    super();
    this.config = config;
    this.setTestId('empty-state');
  }

  render(): void {
    this.el.innerHTML = `
      <div style="text-align:center;padding:60px 24px;max-width:480px;margin:0 auto;">
        <div style="font-size:48px;margin-bottom:16px;">${this.config.icon}</div>
        <h3 style="font-size:18px;font-weight:600;color:#111827;margin:0 0 8px 0;">${this.esc(this.config.title)}</h3>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px 0;line-height:1.5;">${this.esc(this.config.description)}</p>
        ${this.config.actionLabel ? `<button data-testid="${this.esc(this.config.actionTestId || 'empty-action')}" style="padding:10px 24px;background:#7c2d12;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">${this.esc(this.config.actionLabel)}</button>` : ''}
        ${this.config.secondaryText ? `<p style="font-size:13px;color:#9ca3af;margin-top:16px;">${this.esc(this.config.secondaryText)}</p>` : ''}
      </div>
    `;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

export const EMPTY_STATES = {
  knowledge: {
    icon: '📚',
    title: 'No Knowledge Sources Yet',
    description: 'Knowledge sources are the content your chatbot uses to answer customer questions. Upload documents, crawl your website, or write FAQs to get started.',
    actionLabel: 'Upload Your First Document',
    actionTestId: 'empty-kb-action',
    secondaryText: 'Your chatbot can only be as smart as the knowledge you give it.',
  },
  analytics: {
    icon: '📊',
    title: 'No Analytics Data Yet',
    description: 'Analytics will show once you start having conversations. Track message volume, token usage, and knowledge performance in one place.',
    actionLabel: 'Go to Setup Wizard',
    actionTestId: 'empty-analytics-action',
    secondaryText: 'Complete the onboarding wizard to see sample data.',
  },
  conversations: {
    icon: '💬',
    title: 'No Conversations Yet',
    description: 'Conversations appear here when your widget is installed on your website and customers start chatting. You can also test your chatbot manually.',
    actionLabel: 'Test Your Chatbot',
    actionTestId: 'empty-conversations-action',
    secondaryText: 'Install the widget on your website to start receiving customer messages.',
  },
  apiKeys: {
    icon: '🔑',
    title: 'No API Keys Yet',
    description: 'API keys allow programmatic access to your chatbot. Create one to integrate with your applications or third-party tools.',
    actionLabel: 'Create API Key',
    actionTestId: 'empty-apikeys-action',
  },
  users: {
    icon: '👥',
    title: 'No Team Members Yet',
    description: 'Invite your team members to collaborate on configuring and managing your customer support chatbot.',
    actionLabel: 'Invite Team Members',
    actionTestId: 'empty-users-action',
    secondaryText: 'Start with your workspace and add members as you grow.',
  },
};
