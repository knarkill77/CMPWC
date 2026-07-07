## 2025-05-15 - [Dynamic Toggle Accessibility]
**Learning:** Interactive mobile menu buttons should always implement `aria-label`, `aria-expanded`, and `aria-controls` targeting the menu container's ID for screen reader accessibility. When verifying these with Playwright, use stable attributes like `aria-controls` for locators rather than text labels, as labels often change state dynamically (e.g., "Open menu" to "Close menu").
**Action:** Use `page.locator('button[aria-controls="mobile-menu"]')` for robust E2E testing of toggle states.

## 2025-05-15 - [Skip to Content Link Implementation]
**Learning:** The 'Skip to content' link must be the first focusable element and requires specific focus styles (`focus:not-sr-only focus:absolute`) to be visible against dark themes. Wrapping the primary page content in a `<main id="main-content">` provides a clear semantic target.
**Action:** Always include a skip link targeting a `<main>` element in the root layout.
