Admin Dashboard UI Structure (Iteration 1)

Pages (top-level):
- Dashboard Home (/)
- Analytics (/analytics)
- Conversations (/conversations)
- Knowledge (/knowledge)
- Customer Journey (/journey)
- Widget Management (/widgets)
- API Keys (/api-keys)
- Billing (/billing)
- Team Management (/team)
- Settings (/settings)
- Audit Logs (/audit-logs)

Common layout:
- Top nav: brand, search, notifications, user menu
- Side nav: pages list (collapsible)
- Content area: page-specific components
- Responsive: single-column on small screens, two-column on medium, three-column on large where appropriate

Key components (reusable):
- SummaryCard: title, metric, sparkline
- Table: paginated table with filters and column configuration
- Timeline: recent activity list
- Modal: for detail views (transcript, API key creation)
- LivePreview: widget preview iframe or simulated rendering

Accessibility & UX:
- Keyboard navigation, ARIA labels for widgets, color contrast for charts

