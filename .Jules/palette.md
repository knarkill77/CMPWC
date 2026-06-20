## 2025-05-14 - [Mobile Menu Toggle Accessibility]
**Learning:** When implementing a mobile menu toggle, it is crucial to use `aria-label`, `aria-expanded`, and `aria-controls` to ensure screen readers can properly interpret the state and relationship of the toggle and the menu container.
**Action:** Always include these three ARIA attributes on mobile menu buttons and ensure the menu container has a matching `id`.

## 2025-05-14 - [Skip to Content Pattern]
**Learning:** For single-page applications with fixed headers, a "Skip to content" link is essential for keyboard navigation. It must be visually hidden by default (using `.sr-only`) but become visible when focused to aid sighted keyboard users.
**Action:** Implement a skip link as the first focusable element in the DOM, targeting the main content area.
