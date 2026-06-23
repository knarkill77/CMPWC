## 2025-05-15 - Accessibility and Navigation Improvements

**Learning:** The 'Skip to content' link requires specific focus styles (`focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:text-black focus:p-4`) to ensure clear visibility and accessibility against the dark theme. Also, interactive mobile menu buttons should always implement `aria-label`, `aria-expanded`, and `aria-controls` targeting the menu container's ID for screen reader accessibility.

**Action:** Always implement a skip link in the root layout and ensure mobile toggles have full ARIA coverage in future micro-UX tasks.
