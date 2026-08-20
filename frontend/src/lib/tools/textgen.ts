export interface GeneratorField {
  id: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
}

export interface GeneratorTemplate {
  fields: GeneratorField[];
  build: (values: Record<string, string>) => string[];
}

export function pickFrom<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

export const REPLY_GENERATOR: GeneratorTemplate = {
  fields: [
    { id: 'context', label: 'Context or message you received', placeholder: 'e.g. "Thanks for the demo — we will circle back next quarter."', type: 'textarea', required: true },
    { id: 'channel', label: 'Channel', placeholder: 'Email', type: 'select', options: ['Email', 'LinkedIn', 'Twitter/X', 'Text message', 'Slack', 'Review response'] },
    { id: 'tone', label: 'Tone', placeholder: 'Professional', type: 'select', options: ['Professional', 'Friendly', 'Persuasive', 'Concise', 'Appreciative'] },
  ],
  build: (v) => {
    const context = v.context?.trim() || 'your latest message';
    const tone = (v.tone || 'Professional').toLowerCase();
    return [
      `Thank you for reaching out about this. ${capitalize(context)} — I appreciate the context.\n\n${tone === 'concise' ? 'Here is the quick answer:' : 'Here is how I would suggest we move forward:'}\n1. Confirm the key point from your note.\n2. Offer the next concrete step.\n3. Set an expectation for timing.\n\nLooking forward to hearing from you.`,
      `Thanks for the note — I wanted to make sure I address ${lowerFirst(context)} properly.\n\nA few thoughts:\n- The main takeaway: we can absolutely help here.\n- Recommended next step: let's get 15 minutes on the calendar.\n- If a different channel works better for you, just say the word.\n\nBest regards`,
      `Really appreciate you sharing this. To keep things moving:\n\n1) What matters most to you right now?\n2) Is there a deadline we should be working toward?\n\nReply whenever works — ${tone === 'concise' ? 'short and sharp is perfect' : 'no rush at all'}.`,
    ];
  },
};

export const ANSWER_GENERATOR: GeneratorTemplate = {
  fields: [
    { id: 'question', label: 'Your question', placeholder: 'e.g. What is the difference between a qualification score and lead score?', type: 'textarea', required: true },
    { id: 'depth', label: 'Answer depth', placeholder: 'Balanced', type: 'select', options: ['Quick (2–3 sentences)', 'Balanced (1 paragraph)', 'Detailed (with examples)'] },
  ],
  build: (v) => {
    const q = v.question?.trim() || 'this question';
    const depth = v.depth || 'Balanced';
    return [
      depth === 'Quick (2–3 sentences)'
        ? `${capitalize(q.replace(/[?]+$/, ''))} — in short: it depends on the context you are optimizing for. Compare the specific variables involved, weigh the trade-offs against your goal, and pick the option that best fits your constraints.`
        : `${capitalize(q.replace(/[?]+$/, ''))}? Here is a clear breakdown.\n\nThe core idea is simple: identify the deciding factors, evaluate them against your objective, and choose accordingly. In practice, most teams start with the option that requires the least setup, measure the outcome, and only then invest in the heavier alternative.\n\nA practical example: if you are choosing between two tools, list the must-have requirements, score each option 1–5, and add up the totals. The winner is usually obvious once the criteria are written down.`,
    ];
  },
};

export const EMAIL_RESPONSE_GENERATOR: GeneratorTemplate = {
  fields: [
    { id: 'received', label: 'Email you received (or topic)', placeholder: 'e.g. A customer asking about upgrading their plan', type: 'textarea', required: true },
    { id: 'relationship', label: 'Relationship', placeholder: 'Customer', type: 'select', options: ['Customer', 'Prospect', 'Colleague', 'Partner', 'Recruiter'] },
    { id: 'tone', label: 'Tone', placeholder: 'Professional', type: 'select', options: ['Professional', 'Warm', 'Direct', 'Apologetic'] },
  ],
  build: (v) => {
    const topic = v.received?.trim() || 'your email';
    const relationship = v.relationship || 'Customer';
    const tone = v.tone || 'Professional';
    return [
      `Subject: Re: Your message\n\nHi there,\n\nThank you for reaching out — I read your note about ${lowerFirst(topic)} carefully.\n\n${tone === 'Direct' ? 'Here is the direct answer:' : 'Here is what I can confirm right now:'}\n• We have received your request.\n• The next step is [concrete action].\n• You can expect a follow-up by [day/time].\n\nIf anything is unclear, just reply to this email — happy to clarify.\n\nBest regards,\n[Your name]`,
      `Subject: Quick update\n\nHi,\n\nThanks for the note regarding ${lowerFirst(topic)}.\n\nI have looked into this and wanted to give you a straight answer: [summary of outcome]. For ${relationship.toLowerCase()}s like you, we also recommend [value-add suggestion], which should make things even smoother.\n\nLet me know if you would like to hop on a quick call to walk through it.\n\nBest,\n[Your name]`,
    ];
  },
};

export const LETTER_GENERATOR: GeneratorTemplate = {
  fields: [
    { id: 'occasion', label: 'Letter purpose', placeholder: 'e.g. A cover letter for a SaaS sales role', type: 'text', required: true },
    { id: 'recipient', label: 'Recipient', placeholder: 'e.g. Hiring Manager', type: 'text' },
    { id: 'details', label: 'Key details to include', placeholder: 'e.g. 4 years in B2B SaaS sales, quota overachievement, CRM experience', type: 'textarea' },
  ],
  build: (v) => {
    const purpose = v.occasion?.trim() || 'your letter';
    const recipient = v.recipient?.trim() || 'Dear Sir or Madam';
    const details = v.details?.trim() || 'your relevant experience';
    return [`${recipient},\n\nI am writing to you regarding ${lowerFirst(purpose)}.\n\nWith a background that includes ${lowerFirst(details)}, I bring a combination of practical experience and measurable results. Over the past years, I have consistently delivered outcomes by combining structured thinking with a hands-on approach.\n\nI would welcome the opportunity to discuss how I can contribute further. I am available for a conversation at your convenience.\n\nThank you for your time and consideration.\n\nSincerely,\n[Your name]\n[Phone number] · [Email]`];
  },
};

export const BLOG_TITLE_GENERATOR: GeneratorTemplate = {
  fields: [
    { id: 'topic', label: 'Blog topic', placeholder: 'e.g. AI lead capture for B2B SaaS', type: 'text', required: true },
    { id: 'angle', label: 'Angle', placeholder: 'How-to', type: 'select', options: ['How-to', 'Listicle', 'Problem/Solution', 'Data-driven', 'Comparison'] },
  ],
  build: (v) => {
    const topic = v.topic?.trim() || 'your topic';
    const angle = v.angle || 'How-to';
    const titles: Record<string, string[]> = {
      'How-to': [
        `How to Master ${capWords(topic)} in 2026`,
        `${capWords(topic)}: A Step-by-Step Guide for Beginners`,
        `The 7-Step Blueprint for ${capWords(topic)}`,
      ],
      'Listicle': [
        `10 Proven Ways to Improve ${capWords(topic)}`,
        `${capWords(topic)}: 15 Mistakes to Avoid at All Costs`,
        `7 ${capWords(topic)} Strategies That Actually Work`,
      ],
      'Problem/Solution': [
        `Why ${capWords(topic)} Fails (and How to Fix It)`,
        `The Hidden Cost of Ignoring ${capWords(topic)}`,
        `${capWords(topic)}: The Problem Nobody Talks About`,
      ],
      'Data-driven': [
        `${capWords(topic)}: What the Data Says in 2026`,
        `5 Statistics That Prove ${capWords(topic)} Matters`,
        `The State of ${capWords(topic)} — Numbers You Need to Know`,
      ],
      'Comparison': [
        `${capWords(topic)}: Old vs New — Which Wins?`,
        `${capWords(topic)} vs the Alternatives: An Honest Comparison`,
        `A/B Testing ${capWords(topic)}: What Actually Moves the Needle`,
      ],
    };
    return titles[angle] ?? titles['How-to'];
  },
};

export const CUSTOMER_SERVICE_SCRIPT_GENERATOR: GeneratorTemplate = {
  fields: [
    { id: 'scenario', label: 'Scenario', placeholder: 'e.g. A customer is angry about a delayed shipment', type: 'text', required: true },
    { id: 'channel', label: 'Channel', placeholder: 'Live chat', type: 'select', options: ['Live chat', 'Phone call', 'Email', 'Social media'] },
  ],
  build: (v) => {
    const scenario = v.scenario?.trim() || 'the situation';
    const channel = v.channel || 'Live chat';
    return [
      `**1. Acknowledge & de-escalate**\n"Thank you for bringing this to our attention — I completely understand why ${lowerFirst(scenario)} is frustrating. Let me take ownership of this for you."\n\n**2. Clarify & investigate**\n"To get this resolved as quickly as possible, can you confirm the order number and the specific issue you experienced? I'm checking this right now."\n\n**3. Resolve or escalate**\n"Here's what I can do for you immediately: [resolution]. If that doesn't fully solve it, I'll personally escalate to [team] and follow up with you by [time]."\n\n**4. Confirm & close**\n"Does that resolve everything for you today? Is there anything else I can help with?"`,
      `**Opening (${channel.toLowerCase()})**\n"Hi [Name], thanks for reaching out about ${lowerFirst(scenario)}. I'm sorry this happened — let's fix it together."\n\n**Gathering info**\n"Could you share any reference number or the date this occurred? That will help me locate it instantly."\n\n**Solution framing**\n"I've found the issue. Here's what happened: [cause]. Here's what we'll do: [fix + timeline]."\n\n**Prevention**\n"We're adding a safeguard so this doesn't repeat — here's what we've put in place."\n\n**Closing**\n"Anything else I can assist with? You've been great to work with."`,
    ];
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capWords(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}