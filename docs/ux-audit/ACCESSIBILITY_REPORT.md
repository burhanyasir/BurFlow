# Accessibility Report — BurFlow

## Summary
The product should be usable, understandable, and comfortable for all visitors, including keyboard-only and screen-reader users.

## Review Areas
### Color Contrast
- Ensure all text meets WCAG AA contrast requirements
- Make sure primary buttons and text labels remain readable on light backgrounds

### Keyboard Navigation
- Ensure all interactive elements can be reached via keyboard
- Make focus states visible and strong

### Screen Readers
- Buttons and chips should have clear labels
- Chat interactions should expose state clearly

### Focus States
- Every interactive element should show a visible focus outline
- The widget should preserve focus well during open/close interactions

### ARIA Labels
- The widget launcher, close button, input, and action buttons should have explicit labels where needed

### Font Sizes
- Body copy should remain legible on small screens
- Interactive labels should not be overly small or cramped

## Priority Recommendations
1. Audit current contrast ratios for primary CTA and text
2. Improve default focus appearance across the page and widget
3. Add accessible names to widget controls and conversational actions
4. Ensure tap targets and chip spacing remain comfortable for assistive tech and touch users
