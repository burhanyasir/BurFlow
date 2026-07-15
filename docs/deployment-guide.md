# BrightSmile AI — Deployment Guide

This guide walks through taking a client from signed proposal to a live chatbot on their website.

## One-Click Deploy (Client Self-Serve)

Once a client's tenant exists, they can go live without engineering help:

1. Send the client to **`/install`** (e.g., `https://your-host/install`).
2. They enter their subdomain → the page generates their exact install snippet.
3. They paste it before `<body>` on their site (or in their CMS embed/footer editor).
4. The assistant is live immediately — no build, no deploy pipeline.

This is the fastest path to a closed, live customer. Use it for the first-paying-customer push.

## Prerequisites

Before deploying, the client should have:

- A live, public website
- Branding assets (logo, colors) — optional but recommended
- Approved chatbot content (from the Website Scanner or manual entry)

## Step-by-Step Deployment

### 1. Create the client

In **Client CRM**, click **+ New Client**. Fill in name, website, industry, and budget. This also creates their tenant and initializes the onboarding checklist.

### 2. Scan the website

Open the client → **Website Scanner**. Enter their URL and click **Start Scan**. The scanner extracts services, FAQs, and team mentions. Review the results and click **Apply to Chatbot Config**.

### 3. Configure branding

Open **Tenants & Branding**. Set the brand name, subdomain, colors, chatbot title, and greeting. Use the live widget preview to confirm the look.

### 4. Generate proposal & invoice

From the client profile, generate a proposal (pick a tier) and, once accepted, create the first invoice.

### 5. Complete onboarding tasks

In **Onboarding**, check off the deployment-category tasks as you finish them. The Deployment center shows readiness.

### 6. Deploy the widget

Open **Deployment**. When readiness is green, copy the install snippet and paste it immediately before the closing `</body>` tag of the client's website. For client self-serve deployment, send them to **`/install`** where they enter their subdomain and get the exact snippet to paste.

```html
<!-- BrightSmile AI Chatbot -->
<script>
  (function(w,d,s,o,f){
    w.BrightSmileWidget={tenantId:"...",apiUrl:"/embed.js"};
    f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src="/embed.js";
    f.parentNode.insertBefore(j,f);
  })(window,document,'script');
</script>
<!-- End BrightSmile AI Chatbot -->
```

### 7. Verify

Reload the client's site, open the chat bubble, and send a test message such as "Do you take Delta Dental?" or "Book a cleaning Friday." Confirm the assistant responds and books correctly.

## Custom Domains

To use a client's own domain (e.g., `chat.client.com`), set `custom_domain` on the tenant and configure DNS/CNAME to the BrightSmile AI host. This requires the production proxy to route that host to the widget bundle.

## Rollback

To disable a client's bot, set `is_active = 0` on their tenant (Console → Tenants & Branding → toggle). The widget will stop loading.

## Troubleshooting Deployments

See the **Troubleshooting Guide** for scanner failures, widget-not-loading, and styling issues.
