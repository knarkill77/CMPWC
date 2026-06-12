## 2025-06-12 - Accessibility Foundations for Wrestling Showcase
**Learning:** Even for a focused event site, foundational a11y like skip links, smooth scroll, and ARIA labels on toggles are critical for a professional "elite" feel. The `sr-only` class is a prerequisite for these patterns.
**Action:** Always verify `sr-only` exists in the utility layer before implementing skip-to-content links.

## 2025-06-12 - Handling Empty Main Branches
**Learning:** If the `main` branch is nearly empty, initializing the codebase from a feature branch in a separate commit ensures a cleaner diff for the actual UX enhancements, preventing them from being buried in a project bootstrap.
**Action:** Commit the project base first when working on an uninitialized repository.
