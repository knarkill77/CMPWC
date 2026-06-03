## 2026-06-03 - [Improved Accessibility & Smooth Scroll]
**Learning:** Decorative icons from lucide-react should always have `aria-hidden="true"` to avoid confusing screen readers, and mobile menus require `aria-expanded` and `aria-controls` for proper accessibility. Smooth scrolling via CSS `scroll-behavior: smooth` is a low-cost, high-impact UX win for single-page landing sites.
**Action:** Apply these patterns by default in future UX enhancements.
