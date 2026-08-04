# How BurFlow Protects Your Data

BurFlow is designed to keep each customer’s data separate, stay transparent about what is tested, and fail safely when something goes wrong.

## Tenant data isolation
BurFlow treats each customer workspace as its own private environment. The platform tests this directly by creating separate tenants and verifying that one customer cannot see another customer’s configuration, files, or conversations.

The existing test suites confirm that:
- two tenants can be created independently,
- each tenant receives its own widget credentials,
- public widget config is scoped to the correct tenant,
- tenant A and tenant B see only their own branding and content,
- conversations and chat sessions stay tied to the correct workspace,
- one tenant cannot access another tenant’s knowledge files or conversations.

In plain terms, customer data is kept in its own lane and is not shared across tenants by accident.

## What is already tested
The current security and isolation checks cover the most important trust points:
- tenant signup and workspace creation,
- tenant-scoped widget configuration and branding,
- tenant-scoped conversations and chat sessions,
- blocked access to another tenant’s knowledge files,
- public widget config that does not expose private API keys,
- consent handling for privacy-sensitive chat use,
- safe fallback behavior when a widget request cannot resolve to a valid tenant.

These checks are part of the existing SaaS security, widget, and configuration test suites, and they are currently passing.

## How the widget fails safely
The widget is built to avoid breaking a customer’s site if a chat request fails or the service returns incomplete information. When the chat stream encounters a network problem, an HTTP error, or malformed data, the widget reports the issue in the chat and keeps the experience usable instead of leaving the page blank or broken.

The widget also includes a fallback experience for situations where the AI does not have enough confidence to answer precisely. In those cases, it can offer practical next steps such as contacting sales, booking a demo, or leaving a message rather than pretending to know more than it does.

## Access control and privacy measures
BurFlow already includes several safeguards for access and privacy:
- tenant-scoped API keys and widget credentials,
- public widget config that avoids exposing secret credentials,
- tenant-based routing for conversations and knowledge assets,
- consent-aware chat behavior for privacy and GDPR-style requirements,
- clear separation between admin configuration and public widget access.

## Widget failure behavior
The widget is designed to fail safely during onboarding or streaming problems rather than leave users with a blank or broken experience. The current implementation handles several failure cases directly:
- network failures during chat streaming call the error handler and stop the request without crashing the widget,
- non-OK HTTP responses surface an error message to the user instead of silently failing,
- malformed or partial stream payloads are ignored safely, and
- stream aborts are treated as expected cancellation rather than a visible error.

This means a customer-facing issue such as a bad connection, failed API response, or incomplete stream data is surfaced as a recoverable chat error and fallback guidance rather than a hard failure.

## Admin escalation path
There is no evidence of a dedicated admin-side flag or review workflow for bad AI conversations yet. The admin conversations page exists and the conversation status model already includes an escalated state, but the current UI only renders conversation history and status badges. There is no visible button to flag a conversation, no review queue, and no dedicated flagged-conversations view.

A minimal escalation path would be:
1. add a flag action on a conversation row or detail modal,
2. store the flag reason and timestamp,
3. show a separate flagged conversations list or queue for admins,
4. keep the existing status field so flagged conversations can move from active to escalated.

## Bottom line
BurFlow is built around three practical promises:
1. customer data stays isolated by tenant,
2. the core security and isolation paths are tested regularly,
3. the widget and admin surfaces are designed to degrade gracefully rather than fail catastrophically.

If you want, this summary can later be expanded into a more polished customer-facing trust page or linked from the public site’s privacy and security sections.
