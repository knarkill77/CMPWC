## 2025-01-24 - Semantic Main Content and Skip Links
**Learning:** For a single-page application, wrapping the core content in a `<main id="main-content">` tag not only improves SEO and semantic structure but is essential for implementing a functional "Skip to content" accessibility pattern. The skip link must be the first focusable element to be effective for keyboard users.

**Action:** Always verify that a `<main>` landmark exists when adding skip links, and ensure the skip link's focus styles are robust against the background (e.g., using high-contrast colors and clear focus rings).
