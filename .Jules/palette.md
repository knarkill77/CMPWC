## 2025-05-14 - Navigational Accessibility & Focus States

**Learning:** The "Skip to content" link is a critical first-stop for keyboard and screen reader users to bypass repetitive navigation. Consistent, high-contrast focus rings (e.g., `focus-visible:ring-wrestling-red`) are essential for visual feedback in a dark-themed UI.

**Action:** Always include a "Skip to content" link and explicit `focus-visible` styles for all interactive elements in new projects. Ensure decorative icons are hidden from screen readers using `aria-hidden="true"`.
