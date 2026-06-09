## 2025-05-15 - [Sr-only class build failure]
**Learning:** Using Tailwind's arbitrary value syntax for complex properties like `clip-[rect(0,0,0,0)]` can cause PostCSS build failures in production.
**Action:** Use standard CSS properties within a `@layer utilities` block for complex or sensitive utility classes.
