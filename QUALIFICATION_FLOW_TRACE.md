# Qualification Flow Trace

## Objective
This report verifies whether the live engine extracts and retains qualification information from user replies such as "1000".

## Qualification logic under test
The qualification parser in [engine/packages/conversation-orchestrator/src/qualification-engine.ts](engine/packages/conversation-orchestrator/src/qualification-engine.ts) uses regex-based heuristics.

Key behavior:
- It recognizes team size only when the message contains phrases such as "employees", "people", "staff", or "agents".
- A bare number such as "1000" does not match that heuristic by itself.
- The parser therefore does not reliably convert "1000" into a structured qualification field.

## Runtime evidence
During the live run:
- The user replied with "1000" after being asked about team size.
- The engine returned the confusion-repair response instead of a qualification-aware follow-up.
- The trace showed the state still carried:
  - `qualificationState.completed: false`
  - `questionsAskedCount: 0`

This indicates that the answer was not captured in a way that advanced the qualification flow.

## Conclusion
The runtime evidence confirms the audit finding that bare numeric answers are not reliably handled as qualification input. The parser is too brittle to turn a reply like "1000" into meaningful state for the next turn.
