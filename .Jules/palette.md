## 2025-05-15 - [Navigation & Accessibility Enhancements]
**Learning:** In repositories where the `main` branch is nearly empty, the `request_code_review` tool may incorrectly flag incremental updates as complete project bootstraps. This happens because it compares the current state against `main` rather than the active feature branch.
**Action:** Ensure all micro-UX changes are verified against the specific development branch using `git diff <branch_name>` and keep PRs strictly focused on the small enhancements to minimize noise in these scenarios.
