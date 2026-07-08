# Specification Phase Handover

- **Phase:** Specification Intake
- **Status:** COMPLETE
- **Next Agent:** TDD / Design (`tdd-agent.md`)

---

## 1. Domain Glossary

* **Canvas:** An infinite, zoomable rendering area that supports panning, selection, and dragging of nodes.
* **Component Node (Node):** A visual and logical representation of a specific system component (e.g., Relational Database, Event Broker, gRPC Service, Serverless Function).
* **Data Dependency Edge (Edge):** A directed link connecting an output port of a source component node to an input port of a destination component node.
* **System Schema (Schema):** The declarative, version-controlled JSON/YAML definition that represents the system graph, node types, attributes, and dependencies.
* **Cycle:** A closed loop of directed edges where a component node depends on itself directly or transitively (e.g., A -> B -> C -> A).

---

## 2. Gherkin Acceptance Scenarios

### Feature: System Canvas Creation & Visual-Schema Sync

  **Scenario: Drag-and-drop a node onto the canvas**
    Given an empty canvas
    When the user drags a "Relational Database" node with name "CustomerDB" onto the canvas
    Then the canvas should render the "CustomerDB" database node
    And the generated System Schema JSON should contain:
      """json
      {
        "nodes": [
          { "id": "CustomerDB", "type": "relational-database", "properties": {} }
        ]
      }
      """

  **Scenario: Connect two nodes with a directed edge**
    Given a canvas containing a service node "AuthService" and a database node "SessionDB"
    When the user draws an edge from "AuthService" to "SessionDB"
    Then the canvas should render a directed connection from "AuthService" to "SessionDB"
    And the generated System Schema JSON should define a dependency from "AuthService" to "SessionDB":
      """json
      {
        "dependencies": [
          { "from": "AuthService", "to": "SessionDB", "type": "direct-call" }
        ]
      }
      """

### Feature: Graph Theory & Validation

  **Scenario: Detect a cyclic dependency**
    Given a canvas with nodes "GatewayService", "BillingService", and "UserService"
    And a dependency chain: "GatewayService" -> "BillingService" -> "UserService"
    When the user draws an edge from "UserService" to "GatewayService"
    Then the system should trigger a Validation Alert
    And highlight the cyclic dependency path ("GatewayService", "BillingService", "UserService") in red on the canvas
    And the validation state should indicate a cycle violation

  **Scenario: Import valid YAML to render canvas**
    Given an empty canvas
    When the user imports the following YAML schema:
      """yaml
      nodes:
        - id: UserApi
          type: grpc-service
        - id: UserCache
          type: cache-store
      dependencies:
        - from: UserApi
          to: UserCache
          type: read-write
      """
    Then the canvas should automatically render two nodes: "UserApi" and "UserCache"
    And render a directed edge from "UserApi" to "UserCache"

---

## 3. Technical Constraints & Context

1. **Local-First Executions:** The schema parsing, node graph models, and rendering calculations must execute completely on the client side with 0ms network latency constraints.
2. **Hexagonal Architecture Boundary:** The Graph model and traversal algorithms (DFS, cycle check) must be written as a pure TypeScript domain library without any React Flow or DOM-dependent references.
