# Specification Phase Handover (Codebase AST Analyzer Refactoring)

- **Phase:** BDD Specification Intake
- **Status:** COMPLETE
- **Next Agent:** TDD / Design (`tdd-agent.md`)

---

## 1. Domain Glossary

* **AST (Abstract Syntax Tree):** A structural tree representation of code syntax parsed from source files, used here to extract imports, class instantiations, and method calls.
* **Component Node:** A system entity identified in source files (e.g. React UI components, Prisma/Mongo database clients, Kafka event brokers, Express API routers).
* **Dependency Edge:** A directed dependency relationship between components resolved by relative imports or external API calls.
* **C4 Container:** An architectural grouping container (e.g., Frontend React UI, Domain Logic Layer, State & Sync Manager, external-services).
* **Workspace Manifest:** The schema connecting multiple C4 coordinate schemas together.

---

## 2. Gherkin Acceptance Scenarios

### Feature: Codebase AST Analysis and C4 Classification

  **Scenario: React Component File Heuristic Classification**
    Given a file `/src/adapters/MyComponent.tsx`
    And the file imports `react` or `@xyflow/react`
    And the file does not have the base name `app` or `main`
    When the analyzer runs on the codebase
    Then the file should be classified as `gateway-api`
    And the node name should be "MyComponent UI Component"
    And its technology property should be "React Component"

  **Scenario: Database Client Heuristic Classification**
    Given a file `/src/adapters/db.ts`
    And the file imports `prisma`, `knex`, `pg`, or `mongodb`
    Or the file contains a `new PrismaClient()` expression
    When the analyzer runs on the codebase
    Then the file should be classified as `relational-database`
    And the node name should be "Db Database"
    And its technology property should be "Prisma / SQL Database Client"

  **Scenario: Event Broker Client Heuristic Classification**
    Given a file `/src/adapters/broker.ts`
    And the file imports `kafkajs`, `bullmq`, `amqplib`, or `mqtt`
    Or the file instantiates a class with a name containing `Queue` or `Kafka`
    When the analyzer runs on the codebase
    Then the file should be classified as `event-broker`
    And the node name should be "Broker Message Broker"

  **Scenario: REST API Controller Heuristic Classification**
    Given a file `/src/adapters/routes.ts`
    And the file imports `express`, `fastify`, or `@nestjs/common`
    When the analyzer runs on the codebase
    Then the file should be classified as `rest-api`
    And the node name should be "Routes REST Endpoint"

  **Scenario: Mapping Codebase Files to C4 Containers**
    Given a codebase source file at path `src/domain/graph.ts`
    When the analyzer maps the file to a C4 Container
    Then it should be assigned to the `domain-logic` container
    And the container name should be "Domain Logic Layer"

  **Scenario: Detecting Internal Codebase Dependencies**
    Given a source file `src/adapters/Canvas.tsx`
    And it imports relative module `../domain/graph`
    When the analyzer resolves dependencies
    Then a dependency should be created from `canvas` to `graph`
    And the dependency type should be `direct-call`

  **Scenario: Detecting Outbound External API calls**
    Given a source file `src/adapters/Canvas.tsx`
    And it invokes call expression `fetch(...)` or `axios.get(...)`
    When the analyzer resolves dependencies
    Then a dependency should be created from `canvas` to `external-api-target`
    And a rest-api node `external-api-target` should be registered

---

## 3. Technical Constraints & Context

1. **Strict Hexagonal Separation:** The domain core model must have zero imports from `ts-morph` or `fs`.
2. **Deterministic Layout Coordinates:** Dagre layout calculations must run on nodes and dependencies deterministically prior to YAML serialization.
3. **Obsolete File Cleanup:** The workspace manifest generator must delete legacy schema files (`blueprints/blueprint.yaml` and `blueprints/blueprint-components.yaml`).
