# Infrastructure & Architecture (Next.js MVC - Full Stack)

## 1. Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** MongoDB
- **ORM/ODM:** Mongoose (Provides excellent schema validation and maps perfectly to the Model layer)
- **Styling/UI:** Tailwind CSS (or your chosen component library)
- **Bundler:** Next.js default (Webpack/Turbopack - compiles TS to a production bundle)

## 2. Directory Structure (MVC Pattern)
To maintain a clean separation of concerns, the project follows a strict MVC architecture adapted for Next.js. This structure organizes files inside the `src` directory to help manage pages, components, APIs, and assets efficiently.

```text
/src
  /app                # View & Controller Routing Layer
    /api              # Controller Layer (Next.js API Route Handlers)
    (routes)          # Page and Layout components
  /components         # React UI Components
    /ui               # Generic reusable components (buttons, inputs)
    /features         # Domain-specific components (e.g., PostEditor, PostList)
  /hooks              # Custom React hooks
  /models             # Model Layer (Mongoose Schemas)
  /services           # Business Logic Layer (Database interaction)
  /utils              # Shared utility functions and helper modules
  /types              # TypeScript Interface definitions
  /__tests__          # Unit tests
  ```


## 3. Layer Responsibilities
- **Models** (/src/models): Defines the exact structure of the MongoDB collections using Mongoose. Contains no business logic, only schema definitions, types, and database constraints.

- **Services** (/src/services): The core engine. Contains all database queries, data manipulation, and business rules.

- **controllers** (/src/app/api): Next.js API route handlers. These should remain entirely "thin". They only parse incoming HTTP requests, pass data to the Service layer, and return HTTP responses.

- **Views** (/src/app): Contains the routing files, layouts, and page entry points. Files inside /app should be minimal, primarily handling routing and layout, while real logic is delegated to feature folders and services.

- **Components** (/src/components): Contains the actual UI building blocks. Separated into generic UI elements and feature-specific blocks to maintain scalability.