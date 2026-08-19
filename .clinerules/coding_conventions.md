# Full-Stack Coding Conventions

## 1. TypeScript & Compilation
- Use strictly typed TypeScript (`"strict": true` in `tsconfig.json`).
- Avoid `any` types. Define precise interfaces in the `/types` directory for all shared payloads (e.g., API responses).
- **Validation:** Use `zod` to create schemas for all incoming data. These schemas must be used to validate both backend API requests and frontend forms.

## 2. Code Style & Naming Conventions
- Enforce standard ESLint rules (use Next.js default `next/core-web-vitals`).
- Use Prettier for code formatting.
- **Naming Conventions:**
  - **Generic Files/Services:** kebab-case (e.g., `post-service.ts`, `db-connect.ts`).
  - **React Components:** PascalCase (e.g., `PostList.tsx`, `Button.tsx`).
  - **Custom Hooks:** camelCase starting with "use" (e.g., `usePostData.ts`).
  - **Models/Classes:** PascalCase (e.g., `PostModel`).

## 3. Frontend / React Conventions
- **Server Components by Default:** Assume all components in `app/` are Server Components. Fetch data directly from the Service layer here, not via `fetch` to your own API routes.
- **Client Components (`"use client"`):** Only use this directive when you absolutely need React state (`useState`), effects (`useEffect`), or browser event listeners. Keep these components as low in the render tree as possible.
- **Colocation:** If a component or utility is *only* used by one specific route, use private folders (e.g., `_components`) inside that route's directory instead of cluttering the global `/src/components` folder.

## 4. Testing Standards
- **Frameworks:** Jest for backend services; React Testing Library (RTL) paired with Jest for frontend UI components.
- **Unit Testing Requirements:** 
  - Every file in `/services` must have a corresponding `.test.ts` file in the `/__tests__/services` directory, mocking the MongoDB connection.
  - Core UI components should have tests verifying rendering and user interactions in `/__tests__/components`.

## 5. Error Handling
- **Backend:** Do not return raw database exceptions to the client. Wrap Service calls in `try/catch` blocks and return standardized JSON error responses:
  ```json
  { "success": false, "error": "Meaningful error message", "code": 400 }