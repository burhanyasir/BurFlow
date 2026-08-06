# Smart Suggestions Design — Production Ready

## Objective
Smart suggestions should feel like an extension of a high-performing sales rep. They should guide the visitor toward the right next step and evolve naturally with the conversation.

## Suggestion Model
Each suggestion should include:
- icon
- label
- action
- priority
- context trigger

## Context Inputs
Suggestions should adapt to:
- page scanned
- visitor intent
- conversation stage
- detected products
- detected services
- business profile
- buying signals

## Example Logic
### Pricing Intent
- Compare Plans
- Enterprise Pricing
- ROI Calculator
- Book Demo

### Product Intent
- Compare Products
- Implementation Time
- Customer Stories
- Talk to Sales

### Demo Intent
- Schedule Call
- Contact Sales
- FAQ
- Start Trial

### Service Intent
- Service Outcomes
- Timeline
- Case Studies
- Talk to Sales

## Design Rules
- Never repeat the same suggestion too soon
- Prioritize the highest-value next action
- Prefer action-oriented labels over generic ones
- Maintain a mix of educational, evaluative, and conversion suggestions
- Keep the number of visible suggestions small and focused

## Suggested Data Structure
```json
{
  "icon": "💰",
  "label": "Compare Plans",
  "action": "send_text",
  "priority": 1,
  "trigger": ["pricing", "plan", "compare"]
}
```
