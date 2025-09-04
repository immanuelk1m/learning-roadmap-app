# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- This repo’s application code lives under frontend/ and is a Next.js 15 App Router project (TypeScript + Tailwind).
- Data and auth are provided by Supabase (PostgreSQL + Storage). PDFs are stored in the pdf-documents bucket.
- AI features use Google Gemini via @google/generative-ai and the Vercel AI SDK.
- Deployment is set up for Vercel (see frontend/vercel.json).

Commands (run in frontend/)
- Install dependencies: npm install
- Start dev server (Turbopack): npm run dev
- Build: npm run build
- Start production server (after build): npm start
- Lint: npm run lint
- Environment setup (creates .env.local interactively): node scripts/setup-env.js
- Data migration helpers (TypeScript scripts):
  - npm run migrate:knowledge-nodes
  - npm run migrate:quiz-nodes

Testing
- There is currently no test runner configured in package.json, so running tests (including a single test) is not applicable.

Required environment variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- GEMINI_API_KEY
- Optional for privileged server-side tasks: SUPABASE_SERVICE_ROLE_KEY (used by the service client; falls back to anon key if not set)
- To create .env.local interactively, use: node scripts/setup-env.js

High-level architecture
- Next.js App (frontend/)
  - App Router: pages and API routes live under app/. Client UI is in app/* and components/*.
  - Middleware: frontend/middleware.ts delegates to lib/supabase/middleware.ts, which currently allows all requests (pass-through). The matcher excludes static assets and API routes.
  - Styling/Config: Tailwind (tailwind.config.js, postcss.config.mjs), TS config in tsconfig.json. next.config.ts is minimal.

- API surface (selected representative routes under frontend/app/api/)
  - documents/[id]/analyze (app/api/documents/[id]/analyze/route.ts)
    - Purpose: Analyze a stored PDF into a flat knowledge tree of nodes and persist them.
    - Flow: Auth via Supabase SSR client → fetch document → download PDF from Supabase Storage → generate structured nodes with Vercel AI SDK (google('gemini-2.5-flash') + zod schema) → delete existing knowledge_nodes for the document → insert nodes level-by-level to preserve hierarchy → update documents.status to completed (or failed) and record quiz_generation_status.
    - Operational details: generous timeout (maxDuration = 300), comprehensive structured logging (analyzeLogger, geminiLogger, supabaseLogger), retry/backoff for storage download, memory usage logging, and performance summaries.

  - quiz/generate (app/api/quiz/generate/route.ts)
    - Purpose: Generate a quiz for a single document, emphasizing the user’s weaker concepts.
    - Flow: Auth via Supabase SSR client → fetch document and related knowledge_nodes → download PDF → call geminiQuizModel (JSON output) with a detailed prompt → parse JSON robustly (parseGeminiResponse + validation) → create a quiz_sets row and insert quiz_items linked to nodes when matched by name.

  - study-guide/generate (app/api/study-guide/generate/route.ts)
    - Purpose: Generate a page-based study guide customized to a user’s assessed knowledge.
    - Flow: Service Supabase client (createServiceClient) → fetch document + knowledge_nodes + user’s node understanding → download PDF → prepare inline file data → call geminiStudyGuidePageModel → parse/validate JSON → persist study guide page data (see study_guide_pages schema and migrations).

- Libraries (frontend/lib)
  - supabase/
    - server.ts: SSR-aware client using cookies() and NEXT_PUBLIC_* keys.
    - client.ts: Browser client using NEXT_PUBLIC_* keys.
    - service.ts: Server-side service client; prefers SUPABASE_SERVICE_ROLE_KEY and falls back to anon key (use service role key in secure server environments for privileged writes).
    - middleware.ts: current updateSession is a pass-through (no auth gating).
  - gemini/
    - client.ts: Initializes GoogleGenerativeAI using GEMINI_API_KEY and exposes model configurations: geminiKnowledgeTreeModel, geminiQuizModel, geminiCombinedModel, geminiExtendedQuizModel, geminiStudyGuidePageModel. Also includes file preparation helpers.
    - utils.ts: Robust JSON parsing with recovery (attemptJsonRecovery), validation, and withRetry exponential backoff wrapper for flaky API calls.
    - prompts.ts and schemas.ts: Centralized prompt text and strongly-typed JSON schemas for knowledge trees, quizzes, and study guides (used by both direct Gemini calls and the Vercel AI SDK).
  - logger.ts: Structured logging utility with domain-specific loggers (upload, analyze, quiz, assessment, gemini, supabase). Supports JSON logs in production and readable logs in development; includes timers and correlation IDs.

- Data model and migrations
  - Primary tables used by the app: documents, knowledge_nodes, quiz_sets, quiz_items. Study guide pages are managed via the study_guide_pages table (see SQL under frontend/migrations/).
  - SQL files live in frontend/migrations/*.sql and are intended to be applied via the Supabase SQL editor. Some ad-hoc data migrations/repairs are available via npm run migrate:* scripts.
  - Additional design notes are documented in database_schema.md and STUDY_GUIDE_PAGES_IMPLEMENTATION.md.

Conventions and agent rules (project-specific)
- From .claude/CLAUDE.md:
  - 모든 답변은 한국어로 할 것. (Respond in Korean.)
  - 반드시 코드 수정 후 git commit 할 것. (After code changes, make a git commit.)
- When performing privileged database writes outside API routes, prefer the service client with SUPABASE_SERVICE_ROLE_KEY configured (server-only). Avoid exposing service keys client-side.

Operational notes
- Long-running analysis: The analyze route performs heavy PDF processing and AI calls; allow for multi-minute execution locally and on Vercel (maxDuration = 300 seconds).
- Storage access: PDFs are downloaded from the Supabase Storage bucket pdf-documents using the path stored on the document record.
- Region/deploy: Vercel config (frontend/vercel.json) sets framework: nextjs and regions: ["icn1"]. Adjust as needed for your deployment target.

