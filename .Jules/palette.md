## 2025-05-15 - Accessibility and Navigation Polish

**Learning:** Implementing a "Skip to content" link as the first focusable element is crucial for keyboard users in one-page scrolling sites. Additionally, global focus-visible styles with a high-contrast ring (wrestling-red) ensure that interactive elements are clearly identifiable without relying on default browser outlines which can be inconsistent or invisible on dark backgrounds.

**Action:** Always wrap primary content in a `<main id="main-content">` tag and provide a skip link targeting it. Use `:focus-visible` in the global CSS to provide consistent, accessible focus indicators across the app.
