# Sales Conversion Evaluation Benchmark

## Summary
- Cases evaluated: 736
- Overall aspect accuracy: 68.3%
- Recommended plan accuracy: 70.7%
- Next best action accuracy: 60.9%
- CTA selection accuracy: 39.1%
- CRM bucket accuracy: 71.2%
- Booking trigger accuracy: 100.0%
- Qualification timing accuracy: 43.5%
- Objection handling accuracy: 100.0%
- Trust signal usage accuracy: 60.9%

## Per-industry accuracy
| Industry | Accuracy |
| --- | ---: |
| Healthcare | 33.3% |
| SaaS | 15.6% |
| E-commerce | 0.0% |
| Manufacturing | 0.0% |
| Real Estate | 0.0% |
| Agencies | 0.0% |
| Restaurants | 0.0% |
| Education | 0.0% |
| Professional services | 0.0% |

## Confusion matrices
### Recommended plan
| Expected  Predicted | Starter | Professional | Enterprise |
| --- | --- | --- | --- |
| Starter | 72 | 0 | 36 |
| Professional | 0 | 36 | 18 |
| Enterprise | 108 | 54 | 412 |

### Next best action
| Expected  Predicted | contact_sales | schedule_demo | review_pricing | continue_education | recommend_trial |
| --- | --- | --- | --- | --- | --- |
| contact_sales | 0 | 0 | 0 | 0 | 0 |
| schedule_demo | 0 | 160 | 0 | 0 | 0 |
| review_pricing | 160 | 0 | 64 | 96 | 0 |
| continue_education | 0 | 0 | 0 | 128 | 0 |
| recommend_trial | 32 | 0 | 0 | 0 | 96 |

### CTA selection
| Expected  Predicted | contact-sales | book-demo | compare-plans | start-free-trial |
| --- | --- | --- | --- | --- |
| contact-sales | 32 | 0 | 0 | 160 |
| book-demo | 0 | 160 | 0 | 0 |
| compare-plans | 224 | 0 | 64 | 32 |
| start-free-trial | 0 | 0 | 0 | 32 |
| request-quote | 32 | 0 | 0 | 0 |

### CRM lead bucket
| Expected  Predicted | cold | warm | hot |
| --- | --- | --- | --- |
| cold | 36 | 0 | 12 |
| warm | 60 | 144 | 116 |
| hot | 0 | 24 | 344 |

## Binary metrics
| Aspect | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Booking trigger | 100.0% | 100.0% | 100.0% |
| Qualification timing | 0.0% | 0.0% | 0.0% |
| Objection handling | 100.0% | 100.0% | 100.0% |
| Trust signal usage | 60.9% | 100.0% | 75.7% |

## Failure analysis
- Total failing cases: 684

### SaaS pricing evaluation for startup — 10 staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 10 staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 10 staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 10 staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 10 staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 10 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 10 staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 10 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 50 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 250 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS pricing evaluation for startup — 1200+ staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### SaaS demo scheduling for enterprise buyer — 10 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm

### SaaS demo scheduling for enterprise buyer — 10 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm

### SaaS demo scheduling for enterprise buyer — 50 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm

### SaaS demo scheduling for enterprise buyer — 50 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm

### SaaS demo scheduling for enterprise buyer — 250 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm

### SaaS demo scheduling for enterprise buyer — 250 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm

### SaaS demo scheduling for enterprise buyer — 1200+ staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot

### SaaS demo scheduling for enterprise buyer — 1200+ staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot

### SaaS demo scheduling for enterprise buyer — 1200+ staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot

### SaaS demo scheduling for enterprise buyer — 1200+ staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot

### SaaS demo scheduling for enterprise buyer — 1200+ staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot

### SaaS demo scheduling for enterprise buyer — 1200+ staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot

### SaaS competitive comparison inquiry — 10 staff, $75, new customer, competitors objection
- Industry: SaaS
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 10 staff, $75, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 10 staff, $250, new customer, competitors objection
- Industry: SaaS
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 10 staff, $250, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 10 staff, $900, new customer, competitors objection
- Industry: SaaS
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 10 staff, $900, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 10 staff, $4200, new customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 10 staff, $4200, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $75, new customer, competitors objection
- Industry: SaaS
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $75, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $250, new customer, competitors objection
- Industry: SaaS
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $250, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $900, new customer, competitors objection
- Industry: SaaS
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $900, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $4200, new customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 50 staff, $4200, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $75, new customer, competitors objection
- Industry: SaaS
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $75, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $250, new customer, competitors objection
- Industry: SaaS
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $250, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $900, new customer, competitors objection
- Industry: SaaS
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $900, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $4200, new customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 250 staff, $4200, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $75, new customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $75, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $250, new customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $250, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $900, new customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $900, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $4200, new customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS competitive comparison inquiry — 1200+ staff, $4200, existing customer, competitors objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 10 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 50 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 250 staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $75, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $75, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $250, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $250, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $900, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $900, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $4200, new customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### SaaS product research for API integration — 1200+ staff, $4200, existing customer, none objection
- Industry: SaaS
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce bulk order quote request — 10 staff, $75, new customer, none objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 10 staff, $75, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 10 staff, $250, new customer, none objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 10 staff, $250, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 10 staff, $900, new customer, none objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 10 staff, $900, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 10 staff, $4200, new customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 10 staff, $4200, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $75, new customer, none objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $75, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $250, new customer, none objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $250, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $900, new customer, none objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $900, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $4200, new customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 50 staff, $4200, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $75, new customer, none objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $75, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $250, new customer, none objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $250, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $900, new customer, none objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $900, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $4200, new customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 250 staff, $4200, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $75, new customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $75, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $250, new customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $250, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $900, new customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $900, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $4200, new customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce bulk order quote request — 1200+ staff, $4200, existing customer, none objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales; Trust signal usage mismatch: expected not used but got used

### E-commerce integration support for existing merchant — 10 staff, $75, new customer, timing objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 10 staff, $75, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 10 staff, $250, new customer, timing objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 10 staff, $250, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 10 staff, $900, new customer, timing objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 10 staff, $900, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 10 staff, $4200, new customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 10 staff, $4200, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $75, new customer, timing objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $75, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $250, new customer, timing objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $250, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $900, new customer, timing objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $900, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $4200, new customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 50 staff, $4200, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $75, new customer, timing objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $75, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $250, new customer, timing objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $250, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $900, new customer, timing objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $900, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $4200, new customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 250 staff, $4200, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $75, new customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $75, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $250, new customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $250, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $900, new customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $900, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $4200, new customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce integration support for existing merchant — 1200+ staff, $4200, existing customer, timing objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### E-commerce competitor feature comparison — 10 staff, $75, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 10 staff, $75, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 10 staff, $250, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 10 staff, $250, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 10 staff, $900, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 10 staff, $900, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 10 staff, $4200, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 10 staff, $4200, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $75, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $75, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $250, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $250, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $900, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $900, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $4200, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 50 staff, $4200, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $75, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $75, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $250, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $250, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $900, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $900, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $4200, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 250 staff, $4200, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $75, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $75, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $250, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $250, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $900, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $900, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $4200, new customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### E-commerce competitor feature comparison — 1200+ staff, $4200, existing customer, competitors objection
- Industry: E-commerce
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Healthcare pricing and compliance question — 10 staff, $75, new customer, trust objection
- Industry: Healthcare
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 10 staff, $75, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 10 staff, $250, new customer, trust objection
- Industry: Healthcare
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 10 staff, $250, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 10 staff, $900, new customer, trust objection
- Industry: Healthcare
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 10 staff, $900, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 10 staff, $4200, new customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 10 staff, $4200, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $75, new customer, trust objection
- Industry: Healthcare
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $75, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $250, new customer, trust objection
- Industry: Healthcare
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $250, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $900, new customer, trust objection
- Industry: Healthcare
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $900, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $4200, new customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 50 staff, $4200, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $75, new customer, trust objection
- Industry: Healthcare
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $75, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $250, new customer, trust objection
- Industry: Healthcare
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $250, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $900, new customer, trust objection
- Industry: Healthcare
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $900, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $4200, new customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 250 staff, $4200, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $75, new customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $75, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $250, new customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $250, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $900, new customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $900, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $4200, new customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare pricing and compliance question — 1200+ staff, $4200, existing customer, trust objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $75, new customer, none objection
- Industry: Healthcare
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $75, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $250, new customer, none objection
- Industry: Healthcare
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $250, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $900, new customer, none objection
- Industry: Healthcare
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $900, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $4200, new customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 10 staff, $4200, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $75, new customer, none objection
- Industry: Healthcare
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $75, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $250, new customer, none objection
- Industry: Healthcare
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $250, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $900, new customer, none objection
- Industry: Healthcare
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $900, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $4200, new customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 50 staff, $4200, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $75, new customer, none objection
- Industry: Healthcare
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $75, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $250, new customer, none objection
- Industry: Healthcare
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $250, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $900, new customer, none objection
- Industry: Healthcare
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $900, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $4200, new customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 250 staff, $4200, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $75, new customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $75, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $250, new customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $250, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $900, new customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $900, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $4200, new customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Healthcare solution research for existing provider — 1200+ staff, $4200, existing customer, none objection
- Industry: Healthcare
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing industrial automation quotation — 10 staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 10 staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 10 staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 10 staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 10 staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 10 staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 10 staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 10 staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 50 staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 250 staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing industrial automation quotation — 1200+ staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### Manufacturing reliability research request — 10 staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 10 staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 10 staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 10 staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 10 staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 10 staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 10 staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 10 staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 50 staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 250 staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $75, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $75, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $250, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: cold, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected cold but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $250, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $900, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $900, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $4200, new customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing reliability research request — 1200+ staff, $4200, existing customer, none objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: false, actual: false
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $75, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $75, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $250, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $250, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $900, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $900, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $4200, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 10 staff, $4200, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $75, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $75, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $250, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $250, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $900, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $900, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $4200, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 50 staff, $4200, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $75, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $75, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $250, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Starter, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $250, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $900, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Professional, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $900, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $4200, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 250 staff, $4200, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $75, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $75, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $250, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $250, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $900, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $900, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $4200, new customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Manufacturing authority approval delay — 1200+ staff, $4200, existing customer, authority objection
- Industry: Manufacturing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### Real estate commercial pricing inquiry — 10 staff, $75, new customer, price objection
- Industry: Real Estate
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 10 staff, $75, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 10 staff, $250, new customer, price objection
- Industry: Real Estate
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 10 staff, $250, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 10 staff, $900, new customer, price objection
- Industry: Real Estate
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 10 staff, $900, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 10 staff, $4200, new customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 10 staff, $4200, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $75, new customer, price objection
- Industry: Real Estate
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $75, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $250, new customer, price objection
- Industry: Real Estate
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $250, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $900, new customer, price objection
- Industry: Real Estate
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $900, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $4200, new customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 50 staff, $4200, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $75, new customer, price objection
- Industry: Real Estate
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $75, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $250, new customer, price objection
- Industry: Real Estate
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $250, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $900, new customer, price objection
- Industry: Real Estate
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $900, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $4200, new customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 250 staff, $4200, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $75, new customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $75, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $250, new customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $250, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $900, new customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $900, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $4200, new customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate commercial pricing inquiry — 1200+ staff, $4200, existing customer, price objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $75, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $75, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $250, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $250, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $900, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $900, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $4200, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 10 staff, $4200, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $75, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $75, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $250, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $250, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $900, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $900, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $4200, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 50 staff, $4200, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $75, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $75, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $250, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $250, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $900, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $900, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $4200, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 250 staff, $4200, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $75, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $75, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $250, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $250, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $900, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $900, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $4200, new customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Real estate tour booking request — 1200+ staff, $4200, existing customer, none objection
- Industry: Real Estate
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $75, new customer, none objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $75, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $250, new customer, none objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $250, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $900, new customer, none objection
- Industry: Agencies
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $900, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $4200, new customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 10 staff, $4200, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $75, new customer, none objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $75, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $250, new customer, none objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $250, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $900, new customer, none objection
- Industry: Agencies
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $900, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $4200, new customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 50 staff, $4200, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $75, new customer, none objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $75, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $250, new customer, none objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $250, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $900, new customer, none objection
- Industry: Agencies
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $900, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $4200, new customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 250 staff, $4200, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $75, new customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $75, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $250, new customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $250, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $900, new customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $900, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $4200, new customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Agency proposal request for marketing services — 1200+ staff, $4200, existing customer, none objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $75, new customer, authority objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $75, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $250, new customer, authority objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $250, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $900, new customer, authority objection
- Industry: Agencies
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $900, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $4200, new customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 10 staff, $4200, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $75, new customer, authority objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $75, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $250, new customer, authority objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $250, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $900, new customer, authority objection
- Industry: Agencies
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $900, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $4200, new customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 50 staff, $4200, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $75, new customer, authority objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $75, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $250, new customer, authority objection
- Industry: Agencies
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $250, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $900, new customer, authority objection
- Industry: Agencies
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $900, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $4200, new customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 250 staff, $4200, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $75, new customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $75, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $250, new customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $250, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $900, new customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $900, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $4200, new customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Agency leadership approval objection — 1200+ staff, $4200, existing customer, authority objection
- Industry: Agencies
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $75, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $75, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $250, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $250, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $900, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $900, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $4200, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 10 staff, $4200, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $75, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $75, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $250, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $250, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $900, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $900, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $4200, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 50 staff, $4200, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $75, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $75, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $250, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $250, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $900, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $900, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $4200, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 250 staff, $4200, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $75, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $75, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $250, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $250, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $900, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $900, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $4200, new customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant POS demo request — 1200+ staff, $4200, existing customer, none objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $75, new customer, timing objection
- Industry: Restaurants
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $75, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $250, new customer, timing objection
- Industry: Restaurants
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $250, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $900, new customer, timing objection
- Industry: Restaurants
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $900, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $4200, new customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 10 staff, $4200, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $75, new customer, timing objection
- Industry: Restaurants
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $75, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $250, new customer, timing objection
- Industry: Restaurants
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $250, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $900, new customer, timing objection
- Industry: Restaurants
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $900, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $4200, new customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 50 staff, $4200, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $75, new customer, timing objection
- Industry: Restaurants
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $75, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $250, new customer, timing objection
- Industry: Restaurants
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $250, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $900, new customer, timing objection
- Industry: Restaurants
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $900, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $4200, new customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 250 staff, $4200, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $75, new customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $75, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $250, new customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $250, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $900, new customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $900, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $4200, new customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Restaurant pricing and timing concern — 1200+ staff, $4200, existing customer, timing objection
- Industry: Restaurants
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none; Trust signal usage mismatch: expected not used but got used

### Education admissions pricing and accreditation — 10 staff, $75, new customer, trust objection
- Industry: Education
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 10 staff, $75, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 10 staff, $250, new customer, trust objection
- Industry: Education
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 10 staff, $250, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 10 staff, $900, new customer, trust objection
- Industry: Education
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 10 staff, $900, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 10 staff, $4200, new customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 10 staff, $4200, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $75, new customer, trust objection
- Industry: Education
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $75, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $250, new customer, trust objection
- Industry: Education
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $250, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $900, new customer, trust objection
- Industry: Education
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $900, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $4200, new customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 50 staff, $4200, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $75, new customer, trust objection
- Industry: Education
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $75, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $250, new customer, trust objection
- Industry: Education
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $250, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $900, new customer, trust objection
- Industry: Education
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $900, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $4200, new customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 250 staff, $4200, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $75, new customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $75, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $250, new customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $250, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $900, new customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $900, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $4200, new customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education admissions pricing and accreditation — 1200+ staff, $4200, existing customer, trust objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Education campus visit booking request — 10 staff, $75, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 10 staff, $75, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 10 staff, $250, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 10 staff, $250, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 10 staff, $900, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 10 staff, $900, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 10 staff, $4200, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 10 staff, $4200, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $75, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $75, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $250, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $250, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $900, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $900, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $4200, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 50 staff, $4200, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $75, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $75, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $250, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $250, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $900, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $900, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $4200, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 250 staff, $4200, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: warm
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected hot but got warm; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $75, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $75, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $250, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $250, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $900, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $900, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $4200, new customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: warm, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: CRM bucket mismatch: expected warm but got hot; Trust signal usage mismatch: expected not used but got used

### Education campus visit booking request — 1200+ staff, $4200, existing customer, none objection
- Industry: Education
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: true, actual: true
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Trust signal usage mismatch: expected not used but got used

### Professional services proposal request — 10 staff, $75, new customer, none objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 10 staff, $75, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 10 staff, $250, new customer, none objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 10 staff, $250, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 10 staff, $900, new customer, none objection
- Industry: Professional services
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 10 staff, $900, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected hot but got warm

### Professional services proposal request — 10 staff, $4200, new customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 10 staff, $4200, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected hot but got warm

### Professional services proposal request — 50 staff, $75, new customer, none objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 50 staff, $75, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 50 staff, $250, new customer, none objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 50 staff, $250, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 50 staff, $900, new customer, none objection
- Industry: Professional services
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 50 staff, $900, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected hot but got warm

### Professional services proposal request — 50 staff, $4200, new customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 50 staff, $4200, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected hot but got warm

### Professional services proposal request — 250 staff, $75, new customer, none objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 250 staff, $75, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 250 staff, $250, new customer, none objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 250 staff, $250, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 250 staff, $900, new customer, none objection
- Industry: Professional services
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 250 staff, $900, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected hot but got warm

### Professional services proposal request — 250 staff, $4200, new customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 250 staff, $4200, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected hot but got warm

### Professional services proposal request — 1200+ staff, $75, new customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot

### Professional services proposal request — 1200+ staff, $75, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot

### Professional services proposal request — 1200+ staff, $250, new customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot

### Professional services proposal request — 1200+ staff, $250, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot

### Professional services proposal request — 1200+ staff, $900, new customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot

### Professional services proposal request — 1200+ staff, $900, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services proposal request — 1200+ staff, $4200, new customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot

### Professional services proposal request — 1200+ staff, $4200, existing customer, none objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: false, actual: false
- Expected objection handling: false, actual: false
- Root causes: Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### Professional services competitor and trust concern — 10 staff, $75, new customer, competitors objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 10 staff, $75, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 10 staff, $250, new customer, competitors objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 10 staff, $250, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 10 staff, $900, new customer, competitors objection
- Industry: Professional services
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 10 staff, $900, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 10 staff, $4200, new customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 10 staff, $4200, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $75, new customer, competitors objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $75, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $250, new customer, competitors objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $250, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $900, new customer, competitors objection
- Industry: Professional services
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $900, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $4200, new customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 50 staff, $4200, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $75, new customer, competitors objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $75, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $250, new customer, competitors objection
- Industry: Professional services
- Expected plan: Starter, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Starter but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $250, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Starter; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $900, new customer, competitors objection
- Industry: Professional services
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $900, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Professional
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Plan mismatch: expected Enterprise but got Professional; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $4200, new customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 250 staff, $4200, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $75, new customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $75, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $250, new customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; CRM bucket mismatch: expected warm but got hot; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $250, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $900, new customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $900, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $4200, new customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### Professional services competitor and trust concern — 1200+ staff, $4200, existing customer, competitors objection
- Industry: Professional services
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: false, actual: false
- Expected qualification timing: true, actual: false
- Expected objection handling: true, actual: true
- Root causes: Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none


## Improvement recommendations
- Improve plan recommendation coverage for mid-market and enterprise buyers; several cases depend on persona and scheduling goals.
- Expand CTA alignment logic for industry-specific pathways such as healthcare and e-commerce, especially when pricing and booking cues overlap.
- Strengthen objection sensitivity so price pushback still preserves correct next-step and bucket decisions.
- Refine qualification timing detection when missing qualification is present but the plan does not yet require a direct ask.
- Add more real-world industry variation for real estate, manufacturing, and restaurants before freeze.

## Freeze decision
- Accuracy threshold: 68.3% / 80% (FAIL)
- Recommended plan threshold: 70.7% / 70% (PASS)
- Next best action threshold: 60.9% / 75% (FAIL)
- CTA selection threshold: 39.1% / 75% (FAIL)
- CRM lead classification threshold: 71.2% / 70% (PASS)
- Booking trigger F1 threshold: 100.0% / 80% (PASS)
- Qualification timing F1 threshold: 0.0% / 85% (FAIL)
- Objection handling F1 threshold: 100.0% / 80% (PASS)
- Trust signal usage F1 threshold: 75.7% / 75% (PASS)
- Per-industry threshold: 0.0% / 70% (FAIL)

**Freeze decision:** DO NOT FREEZE

