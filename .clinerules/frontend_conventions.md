# Frontend & React Conventions

## 1. Server vs. Client Components
Next.js App Router defaults to Server Components. We must strictly control where client-side interactivity lives to maximize performance and SEO.

- **Server Components (Default):** Use for fetching data, accessing backend resources directly, and rendering static UI. They cannot use state or browser APIs.
- **Client Components (`"use client"`):** Must include `"use client"` at the very top of the file. Only use these when a component requires:
  - React hooks (`useState`, `useEffect`, `useRef`).
  - Event listeners (`onClick`, `onChange`).
  - Browser-only APIs (`window`, `document`, `localStorage`).

## 2. Component Architecture
Avoid placing massive, complex logic directly inside the `app/` routing directory.
- **Colocation vs Shared:** While Next.js allows colocating components inside the `app/` folder, shared components and domain logic should live in the `/src/components` directory to ensure reusability across the application.
- **Props Passing:** Server Components should handle the heavy lifting (like calling database services) and pass the formatted data down to Client Components as static props.

## 3. Form Handling & Data Mutation
- Prefer Next.js **Server Actions** for form submissions to keep mutations on the server.
- For client-heavy forms requiring complex validations, use `react-hook-form` coupled with `zod` for type-safe schema validation.

## 4. UI & Styling Rules
- Use utility classes (e.g., Tailwind CSS) directly within component files to avoid isolated CSS files.
- Keep generic, reusable components (Buttons, Cards, Modals) completely separated from business logic. They should live in `src/components/ui/` and accept props blindly.
- Group domain-specific logic together. For example, all UI relating to posts should live near each other in `src/components/features/posts/`.