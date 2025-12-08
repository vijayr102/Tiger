
# Swagger AI Agent – Master Architecture Specification

## Project Overview

I am building an **Enterprise-grade Swagger AI Agent**, API-first, using **Node.js + TypeScript + Express**.

This system will:

- Accept **Swagger / OpenAPI (2.0 & 3.x)** documents from:
  - URL
  - File upload
  - Git repository (branch/tag, path)
- Parse, validate, and normalize specs into a **common internal model**.
- Allow a user/agent to:
  - List endpoints / tags
  - Select one / multiple / all endpoints
  - Configure named environments (dev/qa/stage/prod)
- Execute HTTP calls using **Axios** (Node only; no Java/RestAssured runtime).
- Generate **Axios + Jest** test code (RestAssured-style, but JS) from the spec and the templates.
- Expose **MCP tools** so an AI Agent can:
  - Discover operations
  - Plan runs
  - Execute API operations
  - Generate or refine Axios test suites.

Support future extensions:

- **DB-backed storage** (specs, environments, run history, reports)
- **Additional LLM providers** for payload synthesis and test idea generation
- **Web UI (React)** on top of the same APIs
- Export of **Postman collections** and **CI-ready test suites**

This is an **API-first**, clean architecture service, modular and testable, following enterprise conventions.  
It is **not** a UI project in phase 1.

---

## Development Philosophy (Enterprise-Grade Modular)

Copilot must follow these rules:

- Implement **one file at a time**.
- Implement **one module at a time**.
- Never mix responsibilities in a single file.
- Application logic should be **pure functions** wherever possible.

### Domain Layer

- Zero external dependencies (no Axios, no Express, no DB client, no LLM SDK).
- Only business concepts and rules.

### Infrastructure Layer

- No business logic.
- Only adapters to HTTP, Swagger parser, MCP, LLM, DB, logging.

### Controllers

- Thin: input validation, mapping to DTOs, calling use cases, mapping responses.
- No orchestration / algorithmic logic.

### Use Cases

- All “how to do it” workflows live in **application/use cases**.
- Controllers call **one use case per endpoint**.
- Use cases talk to **domain models** and **repositories**.

### MCP Integration Rules

- Each MCP tool gets its own file (per logical tool).
- Adding a new MCP server (e.g., another API test engine) should plug in without breaking existing architecture.
- MCP adapter should work through the same **application/use cases** and **domain models**, not bypass them.

---

## Exact Folder Structure (Swagger AI Agent)

You MUST follow this structure for this project (names adapted to Swagger/API domain, but same layering pattern):

```text
swagger-ai-agent/
├─ .env
├─ .env.development
├─ .env.test
├─ .env.production
├─ logs/
│  ├─ app.log
│  ├─ error.log
│  └─ combined.log
├─ config/
│  ├─ default.ts
│  ├─ development.ts
│  ├─ production.ts
│  └─ test.ts
└─ src/
   ├─ core/
   │  ├─ app.ts
   │  ├─ server.ts
   │  ├─ config.ts
   │  ├─ env.ts
   │  ├─ types.ts
   │  ├─ errors/
   │  │  ├─ AppError.ts
   │  │  ├─ ValidationError.ts
   │  │  ├─ NotFoundError.ts
   │  │  ├─ ExternalServiceError.ts
   │  │  └─ UnauthorizedError.ts
   │  └─ middlewares/
   │     ├─ errorHandler.ts
   │     ├─ requestLogger.ts
   │     ├─ validateRequest.ts
   │     └─ auth.ts
   │
   ├─ api/
   │  ├─ routes/
   │  │  ├─ index.ts
   │  │  ├─ spec.routes.ts
   │  │  ├─ environment.routes.ts
   │  │  ├─ execution.routes.ts
   │  │  ├─ testgen.routes.ts
   │  │  └─ mcp.routes.ts
   │  ├─ controllers/
   │  │  ├─ spec.controller.ts
   │  │  ├─ environment.controller.ts
   │  │  ├─ execution.controller.ts
   │  │  ├─ testgen.controller.ts
   │  │  └─ mcp/
   │  │     ├─ swaggerMcp.controller.ts
   │  │     └─ genericMcp.controller.ts
   │  ├─ dto/
   │  │  ├─ spec.dto.ts
   │  │  ├─ environment.dto.ts
   │  │  ├─ execution.dto.ts
   │  │  └─ testgen.dto.ts
   │  └─ validators/
   │     ├─ spec.validator.ts
   │     ├─ environment.validator.ts
   │     ├─ execution.validator.ts
   │     └─ testgen.validator.ts
   │
   ├─ application/
   │  ├─ spec/
   │  │  ├─ ingestSwagger.usecase.ts
   │  │  ├─ normalizeSpec.usecase.ts
   │  │  ├─ validateSpec.usecase.ts
   │  │  └─ listOperations.usecase.ts
   │  ├─ environment/
   │  │  ├─ createEnvironment.usecase.ts
   │  │  ├─ listEnvironments.usecase.ts
   │  │  ├─ updateEnvironment.usecase.ts
   │  │  └─ deleteEnvironment.usecase.ts
   │  ├─ execution/
   │  │  ├─ planRun.usecase.ts
   │  │  ├─ executeRun.usecase.ts
   │  │  ├─ getRunStatus.usecase.ts
   │  │  └─ retryFailedTest.usecase.ts
   │  ├─ testgen/
   │  │  ├─ generateAxiosTests.usecase.ts
   │  │  └─ exportTestSuite.usecase.ts
   │  └─ llm/
   │     ├─ buildPayloadFromSchema.usecase.ts
   │     └─ suggestAdditionalTests.usecase.ts
   │
   ├─ domain/
   │  ├─ models/
   │  │  ├─ NormalizedSpec.ts
   │  │  ├─ Operation.ts
   │  │  ├─ EnvironmentConfig.ts
   │  │  ├─ RunPlan.ts
   │  │  ├─ RunReport.ts
   │  │  ├─ TestCaseDefinition.ts
   │  │  └─ PayloadTemplate.ts
   │  └─ repositories/
   │     ├─ SpecRepository.ts
   │     ├─ EnvironmentRepository.ts
   │     ├─ RunPlanRepository.ts
   │     └─ TestTemplateRepository.ts
   │
   ├─ infrastructure/
   │  ├─ swagger/
   │  │  ├─ SwaggerLoader.ts
   │  │  ├─ SwaggerParserAdapter.ts
   │  │  └─ OpenApiNormalizer.ts
   │  ├─ http/
   │  │  ├─ AxiosClient.ts
   │  │  └─ AxiosExecutionAdapter.ts
   │  ├─ mcp/
   │  │  ├─ common/
   │  │  │  ├─ McpServer.ts
   │  │  │  └─ McpToolRegistry.ts
   │  │  ├─ swagger/
   │  │  │  └─ tools/
   │  │  │     ├─ listOperations.tool.ts
   │  │  │     ├─ planApiRun.tool.ts
   │  │  │     ├─ executeOperation.tool.ts
   │  │  │     └─ generateAxiosTests.tool.ts
   │  │  └─ otherServers/
   │  ├─ llm/
   │  │  └─ PayloadBuilderLlmClient.ts
   │  ├─ persistence/
   │  │  ├─ InMemorySpecRepository.ts
   │  │  ├─ InMemoryEnvironmentRepository.ts
   │  │  └─ InMemoryRunPlanRepository.ts
   │  ├─ logging/
   │  │  └─ Logger.ts
   │  └─ messaging/
   │     └─ (reserved for future async events)
   │
   ├─ utils/
   │  ├─ idGenerator.ts
   │  ├─ result.ts
   │  └─ schemaUtils.ts
   └─ tests/
      ├─ unit/
      └─ integration/
```

You MUST NOT flatten these layers or mix files across them.

---

## APIs That Must Exist (MANDATORY)

Copilot must generate controllers, DTOs, validators, and routes for the exact modules listed below.

### 1. Swagger / Spec APIs

#### Import & Normalize Specs

**POST `/spec/import`**

Body:

```json
{
  "source": {
    "type": "url",
    "url": "https://api.example.com/swagger.json"
  }
}
```

or

```json
{
  "source": {
    "type": "file",
    "path": "/tmp/api.yaml"
  }
}
```

or

```json
{
  "source": {
    "type": "git",
    "repo": "git@github.com:org/repo.git",
    "ref": "main",
    "filePath": "specs/api.yaml"
  }
}
```

Response:

```json
{ "specId": "...", "title": "...", "version": "...", "operationCount": 0 }
```

#### Validate Spec

**POST `/spec/validate`**

- Validates a given spec (by `specId` or raw content).
- Response includes `valid: boolean` and list of issues.

#### Introspection

**GET `/spec/:specId`**

- Returns high-level spec metadata (title, version, servers, tags, counts).

**GET `/spec/:specId/operations`**

- Returns list of normalized operations:

```json
{ "operationId": "...", "method": "GET", "path": "/customers", "tags": ["..."], "summary": "..." }
```

**GET `/spec/:specId/tags`**

- Returns list of tags and associated operation counts.

---

### 2. Environment APIs (Multiple Named Environments per Spec)

**POST `/environment`**

Body:

```json
{ "specId": "spec-123", "name": "qa", "baseUrl": "https://...", "defaultHeaders": {}, "authConfig": {} }
```

- Creates a named environment like `dev`, `qa`, `stage`, `prod`.

**GET `/spec/:specId/environments`**

- List environments for a spec.

**GET `/environment/:envId`**

- Get details of one environment.

**PUT `/environment/:envId`**

- Update `baseUrl`, headers, auth.

**DELETE `/environment/:envId`**

- Delete environment (logical delete is fine).

---

### 3. Run Planning & Execution APIs

**POST `/execution/plan`**

Body example:

```json
{
  "specId": "spec-123",
  "envName": "qa",
  "selection": {
    "mode": "tag",
    "tags": ["Accounts"]
  }
}
```

- Creates a **RunPlan** with selected operations and default test templates.

Response:

```json
{ "runId": "...", "specId": "...", "envName": "qa", "operationCount": 0, "testCount": 0 }
```

**POST `/execution/run`**

- Can either:
  - Accept `runId` (execute existing plan), or
  - Accept `specId`, `envName`, and `selection` to plan+run in one call.
- Response: immediate summary + `runId`.

**GET `/execution/status/:runId`**

- Returns `RunReport`:
  - total, passed, failed, errors
  - per-test status, timings, HTTP status, request/response details.

**POST `/execution/retry-failed`**

Body:

```json
{ "runId": "..." }
```

- Retries only failed or errored tests from last run.

---

### 4. Test Generation APIs (Axios + Jest Code)

**POST `/testgen/generate-axios-tests`**

Body:

```json
{
  "specId": "spec-123",
  "selection": {
    "mode": "tag",
    "tags": ["Payments"]
  },
  "options": {
    "includeNegativeTests": true,
    "includeAuthTests": true,
    "includeBoundaryTests": true
  }
}
```

- Returns Jest + Axios test file content (string) and a structured list of test cases.

**GET `/testgen/spec/:specId/preview`**

- Returns a **preview** of generated test suite (no persistence in v1).

> Even though phase 1 is stateless, the API is designed so that persistence (DB or filesystem) can be added later without breaking endpoints.

---

### 5. MCP Tool APIs (Swagger Agent)

These are HTTP endpoints for the MCP adapter, not the MCP protocol itself. They bridge to the MCP tools in `infrastructure/mcp/swagger/tools`.

**POST `/mcp/swagger/list-operations`**

Body:

```json
{ "specId": "spec-123" }
```

- Returns operations for the agent to choose from.

**POST `/mcp/swagger/plan-run`**

Body:

```json
{ "specId": "spec-123", "envName": "qa", "selection": { "mode": "full" } }
```

- Returns `{ "runId": "...", "summary": { ... } }`.

**POST `/mcp/swagger/execute-operation`**

Body:

```json
{
  "specId": "spec-123",
  "envName": "qa",
  "operationId": "GET_/customers",
  "overrides": {
    "pathParams": { "id": "123" },
    "query": { "active": true },
    "headers": { "x-correlation-id": "abc" },
    "body": { "...": "..." }
  }
}
```

- Executes a single operation and returns request/response + timing.

**POST `/mcp/swagger/generate-axios-tests`**

- Same as `/testgen/generate-axios-tests`, but oriented for agent workflows.

---

### 6. LLM APIs (Schema + LLM Assisted Payloads)

**POST `/llm/build-payload`**

Input:

```json
{
  "specId": "spec-123",
  "operationId": "POST_/customers",
  "mode": "schema-with-llm",
  "hints": {
    "locale": "IN",
    "domain": "banking"
  }
}
```

Output:

- Single or multiple example request bodies built from schema + LLM.

**POST `/llm/suggest-tests`** (future / optional)

- Given an operation, propose additional edge-case tests to augment templates.

---

## Incremental Development Plan (Copilot MUST Follow This Order)

Copilot must not jump phases. Implement phase by phase, smallest unit possible, and keep each step non-breaking.

### Phase 1 — Project Setup

**Objective:** Create a clean, TypeScript-based Node project with Express and base infrastructure.

Tasks:

- Initialize Node.js + TypeScript project (`tsconfig.json`, `nodemon`/`ts-node` for dev).
- Create folder structure exactly as defined above.
- Implement:
  - `src/core/env.ts` → loads `.env.*`
  - `src/core/config.ts` → merges env + `config/*.ts`
  - `src/core/app.ts` → sets up Express app, JSON middleware, routes skeleton
  - `src/core/server.ts` → starts HTTP server
- Add logging via `winston` (or equivalent) in `src/infrastructure/logging/Logger.ts`.
- Implement `requestLogger` and `errorHandler` middlewares.
- Add **Jest** (or Vitest) test setup and one sample unit test.

---

### Phase 2 — Domain Layer (NO Infrastructure Calls)

**Objective:** Define domain objects and repository interfaces for specs, operations, runs, and environments.

Tasks:

In `src/domain/models/` define:

- `NormalizedSpec` (id, title, version, servers, operations)
- `Operation` (id, method, path, tags, summary, parameters, requestBody, responses, security)
- `EnvironmentConfig` (name, baseUrl, headers, auth)
- `RunPlan` (runId, specId, envName, operations, testCaseDefinitions)
- `RunReport` (summary + per test results)
- `TestCaseDefinition` (test type, expected status, payload strategy)

In `src/domain/repositories/` define interfaces:

- `SpecRepository`
- `EnvironmentRepository`
- `RunPlanRepository`
- `TestTemplateRepository`

> Domain layer must not import Axios, Express, or any external SDKs.

---

### Phase 3 — Infrastructure Skeleton

**Objective:** Prepare adapters without implementing full logic.

Tasks:

- `src/infrastructure/swagger/SwaggerLoader.ts`
  - API: `loadFromUrl`, `loadFromFile`, `loadFromGit` (stub for Git).
- `src/infrastructure/swagger/SwaggerParserAdapter.ts`
  - Wraps swagger/openapi parser library (later).
- `src/infrastructure/swagger/OpenApiNormalizer.ts`
  - Skeleton functions: `normalize(spec: any): NormalizedSpec`.
- `src/infrastructure/http/AxiosClient.ts`
  - Wrap Axios and expose typed `request` function (but simple for now).
- `src/infrastructure/mcp/common/McpServer.ts` + `McpToolRegistry.ts`
  - Skeleton MCP server and registry (no logic yet).
- `src/infrastructure/llm/PayloadBuilderLlmClient.ts`
  - Interface for calling LLM to enrich schemas (placeholder only).
- `src/infrastructure/persistence/*Repository.ts`
  - In-memory implementations for repos (maps keyed by id).

> No business logic; only basic shells.

---

### Phase 4 — Spec Ingestion & Normalization

**Objective:** Read Swagger/OpenAPI (2.0 & 3.x) and convert to `NormalizedSpec`.

Tasks:

- Implement `ingestSwagger.usecase.ts`:
  - Input: `SpecSource` (url/file/git).
  - Steps: call `SwaggerLoader` → `SwaggerParserAdapter` → `OpenApiNormalizer`.
  - Output: `NormalizedSpec`.
- Implement `normalizeSpec.usecase.ts`:
  - Focus on converting parser output to domain `NormalizedSpec`.
- Implement `validateSpec.usecase.ts`:
  - Basic structural validation, returning list of issues.
- Implement `listOperations.usecase.ts`:
  - Returns operations with `operationId`, `method`, `path`, `tags`, `summary`.
- Wire controllers + routes:
  - `spec.routes.ts` and `spec.controller.ts` for `/spec/import`, `/spec/validate`, `/spec/:specId`, `/spec/:specId/operations`.
- Add validators in `spec.validator.ts` for request bodies.

---

### Phase 5 — Environment Configuration

**Objective:** Manage multiple named environments per spec.

Tasks:

- Implement use cases in `application/environment/`:
  - `createEnvironment.usecase.ts`
  - `listEnvironments.usecase.ts`
  - `updateEnvironment.usecase.ts`
  - `deleteEnvironment.usecase.ts`
- Use `EnvironmentRepository` in memory.
- Implement `environment.controller.ts` and `environment.routes.ts`.
- Add validation for `baseUrl`, headers, and auth config in `environment.validator.ts`.

---

### Phase 6 — Run Planning

**Objective:** Plan which operations to test and generate initial test case definitions.

Tasks:

- Implement `planRun.usecase.ts`:
  - Input: `specId`, `envName`, `selection` (mode: single/tag/full).
  - Use `SpecRepository` to fetch spec and operations.
  - For each selected operation, call a **template builder** to build `TestCaseDefinition` set:
    - Happy path
    - Basic validation error
    - Basic auth error (if security present)
  - Persist `RunPlan` using `RunPlanRepository` (in-memory).
- Implement `getRunStatus.usecase.ts` as simple status stub initially.
- Wire `execution.routes.ts` and `execution.controller.ts` for `/execution/plan`.

---

### Phase 7 — Axios Execution Engine

**Objective:** Execute HTTP calls defined by `RunPlan` using Axios.

Tasks):

- Implement `AxiosExecutionAdapter.ts`:
  - Function: `executeOperation(spec, operation, env, overrides?) → InvokeResult`.
- Implement `executeRun.usecase.ts`:
  - Input: `runId` or `{ specId, envName, selection }` (plan+run).
  - For each `TestCaseDefinition`:
    - Build concrete request (URL, method, path params, query, headers, body).
    - Call `AxiosExecutionAdapter`.
    - Compare `status` with expected; mark test `passed`/`failed`/`error`.
  - Build `RunReport` and update status in `RunPlanRepository`.
- Wire `/execution/run` and `/execution/status/:runId` in controller + routes.

---

### Phase 8 — Template-Based Axios + Jest Test Generation

**Objective:** Generate Jest+Axios test code from specs and templates.

Tasks:

- In `application/testgen/generateAxiosTests.usecase.ts`:
  - Use `NormalizedSpec`, `TestCaseDefinition` list to generate runtime structures.
  - Build code strings for:
    - Jest `describe` blocks per path/tag.
    - `it` blocks per test case.
    - Axios calls and `expect` status assertions.
- Implement `testgen.controller.ts` and `testgen.routes.ts`:
  - `/testgen/generate-axios-tests` → returns code as string + metadata.
- Ensure test generation uses **template functions** so they can be extended without breaking existing core.

---

### Phase 9 — LLM-Assisted Payload Builder (Schema + LLM, Not Full Auto)

**Objective:** Use LLM only when swagger examples/defaults are missing.

Tasks:

- Implement `buildPayloadFromSchema.usecase.ts`:
  - Algorithm:
    1. Try to build payload purely from schema & examples.
    2. Identify missing required fields with no examples.
    3. Call `PayloadBuilderLlmClient` only for those fields/schemas.
  - Return example bodies for use by `planRun` or `executeRun`.
- Add `/llm/build-payload` endpoint (controller + dto + validator).
- Ensure **core execution logic** can work even without LLM (LLM is a helper, not a dependency).

---

### Phase 10 — MCP Tool Integration (Hybrid Tool Surface)

**Objective:** Expose MCP tools (and matching HTTP endpoints) for agents.

Tasks:

- Implement tools in `infrastructure/mcp/swagger/tools`:
  - `listOperations.tool.ts`
  - `planApiRun.tool.ts`
  - `executeOperation.tool.ts`
  - `generateAxiosTests.tool.ts`
- Implement `swaggerMcp.controller.ts` and `/mcp/swagger/*` routes:
  - Map HTTP calls to the same use cases as traditional APIs.
- Ensure MCP tools call **only** application use cases; no direct infra in MCP tool files.

---

### Phase 11 — Retry & Partial Reruns + Basic Reporting

**Objective:** Support retry failed tests and minimal reporting.

Tasks:

- Implement `retryFailedTest.usecase.ts`:
  - Given `runId`, fetch report and plan.
  - Build a new temporary `RunPlan` with only failed tests.
- Extend `RunReport` with:
  - Aggregated status by tag, method, path.
- Extend `/execution/status/:runId` to return these aggregates.

---

### Phase 12 — Hardening & Pre-DB Readiness

**Objective:** Make the service robust and ready to be moved to DB-backed persistence.

Tasks:

- Request validation in all validators (Joi/Zod/Yup or custom).
- Structured logs in all critical paths (spec ingest, execute, LLM calls).
- Timeouts, retries, and error mapping in `AxiosClient`.
- Basic rate limiting and size limits for spec upload.
- Unit tests:
  - Normalization
  - PlanRun
  - ExecuteRun (using Axios mock)
  - Test generation
- Keep repositories **interface-driven** so Mongo/Postgres can be plugged later.

---

## What Copilot Should Always Do

Always:

- Respect the **folder boundaries** and layering.
- Ask for missing context (e.g., which use case to implement next) before guessing dependencies.
- Generate code in **small units** (one file / module at a time).
- Write **clean TypeScript** with interfaces and types.
- Add minimal JSDoc or comments for non-trivial logic.
- Keep controllers thin and delegate orchestration to use cases.
- Keep domain models free from infrastructure concerns.

---

## What Copilot Should Never Do

Never:

- Collapse multiple modules into a single “god file”.
- Mix infrastructure logic inside controllers.
- Talk directly to Axios, Swagger parser, or LLM from a controller.
- Import Express or Axios into the domain layer.
- Skip types and rely on `any` unless explicitly unavoidable.
- Break or flatten the folder structure.
- Hard-code environment-specific values inside use cases.

---

## FINAL INSTRUCTIONS

- Use all of the above as the **master architecture specification** for the Swagger AI Agent.
- Generate code incrementally, module-by-module, following the folder structure exactly.
- Always ask me **which module or file to implement next** before writing code.
- Only produce code for the **single file** we are currently building.
- Preserve backwards compatibility across phases; do not introduce breaking changes when extending features.
