# Elite 8 Duals Redesign

This is a modern, responsive website for the Elite 8 Duals wrestling event, built with React, Vite, TypeScript, and Tailwind CSS.

## 🚀 How to Manage Content

The website's content is centralized in a single file to make it easy for you to manage without diving deep into the code.

**File Location:** `src/data/content.ts`

### What you can update:
- **Event Details:** Name, tagline, dates, and venue information.
- **Teams:** Add, remove, or update the list of competing teams and their locations.
- **Schedule:** Update the events for each day of the competition.
- **Contact:** Change the primary contact name and email.

### How to edit:
1. Open `src/data/content.ts`.
2. Update the values within the `siteContent` object.
3. Save the file.
4. If you are running the development server (`npm run dev`), the site will update instantly!

## 🛠️ Development

- **Install Dependencies:** `pnpm install`
- **Start Development Server:** `pnpm dev`
- **Production Build:** `pnpm build`
- **Preview Build:** `pnpm preview`

## 🎨 Branding & Assets

- **Logo:** Located at `src/assets/logo.png`.
- **Colors:** The design uses a wrestling-inspired palette defined in `tailwind.config.js`.
