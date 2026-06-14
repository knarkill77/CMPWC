## 2025-05-15 - Mobile Menu Accessibility Patterns
**Learning:** Interactive toggle elements like mobile menus require a specific set of ARIA attributes (`aria-label`, `aria-expanded`, `aria-controls`) to be fully accessible to screen readers. Relying solely on visual state changes is insufficient.
**Action:** Always implement `aria-expanded` and `aria-controls` on toggle buttons, and ensure the target container has a matching `id`. Use stable attributes for Playwright verification locators as labels may change.
