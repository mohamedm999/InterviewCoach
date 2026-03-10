# Prompt 02 — Frontend (Next.js)

---

## Prompt 2.1 — Frontend Setup & Core Structure

```
In apps/web, configure the Next.js application:

1. Install dependencies:
   npm i axios react-hook-form zod @hookform/resolvers/zod lucide-react recharts js-cookie jwt-decode clsx
   npm i -D @types/js-cookie

2. Configure Styles:
   - Use CSS Modules (*.module.css) for scoped styling.
   - Create a global.css for resets and design tokens (colors, typography).
   - Design System:
     - Colors: Primary (blue/indigo), Secondary (purple), Success (green), Error (red), Neutral (gray/slate).
     - Typography: Inter (Google Fonts).

3. Project Structure:
   src/
   ├── app/
   │   ├── (auth)/login/page.tsx
   │   ├── (auth)/register/page.tsx
   │   ├── (dashboard)/layout.tsx
   │   ├── (dashboard)/dashboard/page.tsx
   │   ├── (dashboard)/analysis/new/page.tsx
   │   ├── (dashboard)/analysis/[id]/page.tsx
   │   ├── (dashboard)/history/page.tsx
   │   ├── (admin)/admin/page.tsx
   │   ├── layout.tsx
   │   └── page.tsx (Landing)
   ├── components/
   │   ├── ui/ (Button, Input, Card, Modal, Spinner)
   │   ├── forms/ (LoginForm, RegisterForm, AnalysisForm)
   │   ├── charts/ (ScoreChart, CategoryRadarChart)
   │   └── layout/ (Navbar, Sidebar, UserMenu)
   ├── lib/
   │   ├── api.ts (axios instance with interceptors)
   │   ├── auth.ts (session management)
   │   └── utils.ts
   ├── hooks/
   │   ├── useAuth.ts
   │   └── useAnalysis.ts
   └── types/
       └── index.ts (mirrors backend DTOs)

4. Configure lib/api.ts:
   - Create axios instance with baseURL from env.
   - Request interceptor: attach Access Token from cookie/storage.
   - Response interceptor:
     - If 401: try to refresh token using /auth/refresh endpoint.
     - If refresh fails: redirect to /login.
```

---

## Prompt 2.2 — Frontend Authentication

```
Implement Authentication in apps/web:

1. Create a `AuthProvider` context (src/context/auth-context.tsx):
   - State: user (User | null), isLoading (boolean).
   - Methods: login, register, logout.
   - On mount: check for existing access token, fetch /users/me to hydrate user state.

2. Create Login Page (app/(auth)/login/page.tsx):
   - Form with email/password.
   - Validation with Zod (email format, required).
   - On submit: call login API, store tokens (cookie for refresh, memory/cookie for access), redirect to /dashboard.

3. Create Register Page (app/(auth)/register/page.tsx):
   - Form with email/password/confirm.
   - Zod validation (passwords match, strength).
   - On submit: call register API, auto-login, redirect to dashboard.

4. Protect Routes:
   - Create a Higher-Order Component or use middleware.ts (Next.js middleware).
   - Middleware logic:
     - If route starts with /dashboard, /analysis, /history: require token.
     - If route starts with /admin: require user.role === 'ADMIN'.
     - If not authenticated: redirect to /login.
     - If unauthorized: redirect to /403 or dashboard.
```

---

## Prompt 2.3 — Features: Analysis Workflow

```
Implement the core Analysis workflow:

1. New Analysis Page (app/analysis/new/page.tsx):
   - Form:
     - Context Selector (Select: Formal, Startup, Technical, Creative).
     - Text Area (min 50 chars, max 5000) with character count.
   - Submit button with loading state.
   - On success: redirect to /analysis/[id].

2. Analysis Results Page (app/analysis/[id]/page.tsx):
   - Fetch data via `useAnalysis(id)`.
   - Layout:
     - Header: Context badge, Date, Version badge.
     - Top Section: Global Score (Circle Progress Chart).
     - Middle Section: Note regarding Categories (Radar Chart or Bar Chart for Tone, Confidence, Readability, Impact).
     - Bottom Section: Recommendations.
       - Filter/Tabs: Priority (High, Medium, Low).
       - Cards: Title, Description, "Show Example" toggle.

3. "Download PDF" Button:
   - Calls POST /analyses/:id/pdf.
   - Handles Blob response.
   - Triggers browser download (window.URL.createObjectURL).
```

---

## Prompt 2.4 — Features: Dashboard & History

```
Implement Dashboard and History views:

1. User Dashboard (app/dashboard/page.tsx):
   - Summary Cards: Total Analyses, Last Score, Average Score.
   - "Start New Analysis" CTA button.
   - "Recent Activity" list (last 3 analyses).
   - Progression Chart (Recharts LineChart):
     - X-Axis: Date.
     - Y-Axis: Global Score.
     - Tooltip showing breakdown.

2. History Page (app/history/page.tsx):
   - Table/List of all analyses.
   - Columns: Date, Context, Global Score, Version.
   - Actions: "View", "Download PDF".
   - Pagination (if API supports it).

3. Admin Dashboard (app/admin/page.tsx):
   - Stats Overview (Cards): Total Users, Total Analyses, Avg Score.
   - User Management Table:
     - User list with Status (Active/Suspended).
     - Button to Toggle Status (PATCH /admin/users/:id/status).
```

---

## Prompt 2.5 — Frontend Testing

```
Set up testing for apps/web:

1. Install: npm i -D @testing-library/react @testing-library/dom jest jest-environment-jsdom @testing-library/user-event

2. Component Tests:
   - LoginForm: should show validation error on invalid email.
   - AnalysisResult: should display correct score and context.
   - Recommendations: should filter by priority.

3. Integration/Flow Test (using Playwright or Cypress - optional but recommended):
   - User logs in.
   - Navigate to New Analysis.
   - Fill form and submit.
   - Verify redirection to Result page.
   - Check if Score is visible.
```
