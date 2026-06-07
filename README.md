# CMP Camps Website

This is a modern, responsive website for CMP Camps, built with React, Vite, TypeScript, and Tailwind CSS.

## 🚀 How to Manage Content

The website's content is centralized in a single file to make it easy for you to manage without diving deep into the code.

**File Location:** `src/data/content.ts`

### What you can update:
- **Brand Info:** Name, tagline, mission, and general description.
- **Featured Camps:** Technical camps like Crab & Leg, Scramble, etc.
- **Satellite Camps:** Information for school and club bookings.
- **Contact:** Address, phone, and email details.

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
