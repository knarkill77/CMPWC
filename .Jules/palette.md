## 2025-05-15 - Incremental UX Improvements in Empty Repos
**Learning:** When working on a redesign branch against an empty main, the `request_code_review` tool may flag a full redesign even if only small touches were added to the feature branch. Focus strictly on the diff between the current branch and its immediate predecessor if possible.
**Action:** Use granular `git diff` to ensure changes stay under the 50-line micro-UX limit.

## 2025-05-15 - Skip Link Implementation
**Learning:** A "Skip to content" link is a high-impact, low-effort accessibility win for keyboard users, especially on sites with fixed navigations.
**Action:** Always include a skip link targeting the primary content area.
