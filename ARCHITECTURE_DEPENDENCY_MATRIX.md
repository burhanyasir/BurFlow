# Architecture Dependency Matrix

This document records the current consumers of the three internal sales playbook signals.

## Signals

- `isPricingIntent`
- `pricingReady`
- `readiness.stage`

## Consumers

| File | Function | Signal Used | Output Affected | Purpose |
| --- | --- | --- | --- | --- |
| `engine/packages/conversation-orchestrator/src/sales-playbook-engine.ts` | `isPricingReady` | `isPricingIntent` | `pricingReady` | Compute whether pricing review should be enabled based on intent and context signals |
| `engine/packages/conversation-orchestrator/src/sales-playbook-engine.ts` | `buildSalesPlaybook` | `isPricingIntent` | `readiness.stage`, `pricingStrategy`, `cta`, `nextStep`, `readiness.pricingReady` | Build the internal feature vector and route pricing intent into readiness, stage, and action branches |
| `engine/packages/conversation-orchestrator/src/sales-playbook-engine.ts` | `buildSalesPlaybook` | `pricingReady` | `readiness.stage`, `readiness.pricingReady`, `nextStep`, `cta`, `pricingStrategy` | Gate whether the conversation advances into Pricing flow and choose the right pricing path |
| `engine/packages/conversation-orchestrator/src/sales-playbook-engine.ts` | `buildSalesPlaybook` | `readiness.stage` | `nextStep`, `cta`, `pricingStrategy`, `readiness.*` | Determine the action branch for the current funnel stage |
| `engine/packages/conversation-orchestrator/src/sales-conversion-engine.ts` | `buildSalesConversionSignals` | indirectly via `playbook` | `nextStep`, `cta`, `recommendationReason` | Expose the chosen playbook outputs to the conversion result API without touching internal signals directly |
| `engine/packages/conversation-orchestrator/src/__tests__/sales-playbook-engine.regressions.test.ts` | test cases | `pricingReady`, `readiness.stage` | validation of playbook behavior | Guard pricing flow semantics in regression scenarios |
| `engine/packages/conversation-orchestrator/src/__tests__/sales-playbook-engine.test.ts` | test cases | `readiness.stage` | validation of stage and CTA selection | Verify awareness/education path outputs |

## Notes

- There are no direct external consumers of `isPricingIntent` or `pricingReady` outside `sales-playbook-engine.ts`.
- `readiness.stage` is used internally only inside `buildSalesPlaybook` to select action branches.
- External code consumes only final playbook outputs like `nextStep` and `cta`.
