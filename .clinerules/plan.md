# Project Execution Plan: Enterprise CMS

## Overview
This document outlines the sequential phases for building the Full-Stack Next.js CMS. The AI (Kiro IDE) must complete each phase and verify its functionality before moving to the next.

---

## Phase 1: Foundation & Infrastructure (Backend Prep)
**Goal:** Establish the database connection, authentication shell, and data models.

*   [ ] **Step 1.1:** Initialize the Next.js App Router project with TypeScript and Tailwind CSS (if not already done).
*   [ ] **Step 1.2:** Create `/utils/db-connect.ts` to manage the MongoDB connection.
*   [ ] **Step 1.3:** Generate all Mongoose schemas inside `/models/` based precisely on the `spec.md` Data Models section.
*   [ ] **Step 1.4:** Setup basic NextAuth.js (or equivalent) in `/app/api/auth/[...nextauth]/route.ts` for Admin authentication.

---

## Phase 2: The Service Layer (Business Logic)
**Goal:** Build the core engine that interacts with MongoDB, ensuring business constraints are respected.

*   [ ] **Step 2.1:** Implement `/services/page-service.ts` and `/services/navigation-service.ts`. **Crucial:** Implement the "Single Default" toggle logic defined in the spec.
*   [ ] **Step 2.2:** Implement `/services/blog-service.ts`, handling relations to Categories and Tags.
*   [ ] **Step 2.3:** Implement services for Users, Media, Carousels, Tags, Categories and Service Items.
*   [ ] **Step 2.4:** Write Jest unit tests in `/__tests__/services/` to verify the "Single Default" logic and CRUD operations.

---

## Phase 3: API Controllers
**Goal:** Expose the Service Layer to the frontend via Next.js Route Handlers.

*   [ ] **Step 3.1:** Create standard CRUD API routes for Pages (`/api/pages`), Blogs (`/api/blogs`), etc.
*   [ ] **Step 3.2:** Ensure all `POST` and `PUT` routes use Zod schemas to validate incoming payloads before passing them to the services.
*   [ ] **Step 3.3:** Create `POST /api/contact`. Integrate server-side CAPTCHA verification before saving to the database.

---

## Phase 4: Admin Portal (Protected Frontend)
**Goal:** Build the UI for the CMS editors.

*   [ ] **Step 4.1:** Create the `/app/admin/layout.tsx` (Sidebar navigation, header). Ensure this entire route group is protected by authentication.
*   [ ] **Step 4.2:** Build the Data Table UI component to list records (Pages, Blogs, Users) with an Active/Deactivate toggle switch.
*   [ ] **Step 4.3:** Build the Create/Edit forms for Pages and Blogs using `react-hook-form`.
*   [ ] **Step 4.4:** Build the Navigation Menu builder UI (`/admin/navigation`) allowing users to add links and set the default menu.

---

## Phase 5: Public Frontend & Modular Components
**Goal:** Render the dynamic, public-facing website based on the active CMS data.

*   [ ] **Step 5.1:** Build the Generic UI Components (`GenericCarousel.tsx`, `MapLocation.tsx`, `ServiceGrid.tsx`) in `/src/components/ui/`.
*   [ ] **Step 5.2:** Build the `ContactSection.tsx` client component, incorporating the frontend CAPTCHA widget.
*   [ ] **Step 5.3:** Implement `/app/page.tsx` (Homepage). It must fetch the default Page from the DB and render the Carousels, Service Grid, and Contact Section.
*   [ ] **Step 5.4:** Implement dynamic routing for standard pages (`/app/[slug]/page.tsx`) and blogs (`/app/blog/[slug]/page.tsx`).

---

## Phase 5.5: End-to-End (E2E) Testing with Playwright
**Goal:** Automate browser workflows to verify critical user paths, admin management, and form submissions.

*   [ ] **Step 5.5.1:** Install Playwright and set up the `playwright.config.ts` configuration file with the `webServer` property pointing to the Next.js local server.
*   [ ] **Step 5.5.2:** Write an E2E test for public routing (`e2e/public-smoke.spec.ts`) to verify that the homepage renders active carousels, services, and the contact section correctly.
*   [ ] **Step 5.5.3:** Write an E2E test for the Admin authentication flow (`e2e/admin-auth.spec.ts`) ensuring restricted dashboard routes block unauthenticated users and successfully log in valid admins.
*   [ ] **Step 5.5.4:** Write an E2E test for the Contact form (`e2e/contact-form.spec.ts`) to verify validation rules and successful submission handling.

---

## Phase 6: Final Polish & Seeding
**Goal:** Ensure the system is robust and ready for deployment.

*   [ ] **Step 6.1:** Create a `/scripts/seed.ts` file to insert an initial Admin user and a default placeholder Homepage to prevent empty-state crashes.
*   [ ] **Step 6.2:** Run ESLint and Prettier across the codebase.
*   [ ] **Step 6.3:** Verify all error boundaries and loading states (`loading.tsx`, `error.tsx`) are implemented in the App Router.