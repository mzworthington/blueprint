# Unit test features

Generated from Vitest (`pnpm generate:features-unit`).

<!-- vitest-feature-reporter--start -->

## CLI

### aggregateHistory

#### aggregateFileHistory

- ✅ computes churn, authorCount, and topAuthorPercent
- ✅ includes churnByWeek when sinceDays is provided

#### computeChurnByWeek

- ✅ buckets commits into weekly counts oldest-first

### analyzer

#### CodebaseAnalyzer Domain Service

- ✅ should correctly run analysis and delegate to writers
- ✅ splits complex monorepos into multiple systems from workspaces
- ✅ should not throw if analyzing an empty file set
- ✅ attaches forensics onto component and container nodes when metrics are provided
- ✅ stops when the abort signal is already aborted

### attachForensics

#### aggregateNodeForensics

- ✅ rolls up max/sum/counts from child forensics
- ✅ rolls up author commits from children
- ✅ rolls up churnByWeek and churn-weighted ownership from children

#### attachForensicsToSchema

- ✅ attaches file metrics to component nodes by filepath
- ✅ aggregates onto container nodes from matching components
- ✅ aggregates onto context system nodes from system components
- ✅ normalizes backslashes in filepath joins

### baseWriter

#### BaseWriter YAML v3 format

- ✅ writes v3 object YAML on context.yaml
- ✅ writes metaData.source when git provenance is provided
- ✅ writes v3 object YAML on containers.yaml
- ✅ writes v3 object YAML on component YAML files

#### resolveLocalSchemaUrl

- ✅ resolves a path-relative schema from this repo blueprints tree

### cancellation

#### cancellation

- ✅ throwIfAborted no-ops without a signal or when not aborted
- ✅ throwIfAborted throws CancellationError when aborted
- ✅ identifies cancellation errors
- ✅ aborts the signal when SIGINT is received
- ✅ aborts the signal when SIGTERM is received

### classify

#### classifyFile

- ✅ classifies hotspot when score meets threshold
- ✅ classifies knowledge silo for complex single-author files
- ✅ does not treat never-touched files as silos
- ✅ can apply both classifications
- ✅ returns empty when neither applies

### collectFileMetrics

#### collectFileMetrics helpers

- ✅ normalizes paths for map keys

### componentLevelWriter

#### ComponentLevelWriter

- ✅ should write component schemas for each container
- ✅ should use correct entityRef format for component schemas
- ✅ should slugify context and container names in entityRef
- ✅ should filter components by containerId
- ✅ should filter dependencies by containerId
- ✅ writes component nodes without layout positions
- ✅ should log successful write for each container

### consoleLogger

#### ConsoleLogger

- ✅ should log info messages with correct icon styles
- ✅ should log warnings
- ✅ should log errors with stack trace or error details

### containerGrouping

#### containerGrouping

- ✅ groups by packages/<name> instead of the first path segment
- ✅ falls back to the folder under src/lib
- ✅ refuses layout-leftover names as container identity
- ✅ skips packages/<name> without package.json when isPackageRoot is provided
- ✅ optionally rolls up _-module-_ container names
- ✅ groups by plugins/<name> the same way as packages/<name>
- ✅ keeps .NET test projects as the container even under nested Domain folders

#### ModelExtractor

- ✅ assigns package containers, marks tests, and hydrates node types from markers
- ✅ marks containers as tests when every source file in them is a test
- ✅ rolls up C# files by layer, skips boilerplate, and types API containers

### containerLevelWriter

#### ContainerLevelWriter

- ✅ should write container schema with correct entityRef
- ✅ should slugify context name in entityRef
- ✅ writes container nodes without layout positions
- ✅ should log successful write

### contextLevelWriter

#### ContextLevelWriter

- ✅ should write context schema with correct entityRef
- ✅ should use an explicit display name when provided
- ✅ should slugify context name in entityRef
- ✅ should merge a second software-system into an existing context diagram
- ✅ joins subsystems to the product hub and leaves other products disconnected
- ✅ should upsert rather than duplicate when rewriting the same system
- ✅ should log successful write

#### personDependenciesForSystems

- ✅ links the person to product hubs only

#### productHubDependenciesForSystems

- ✅ fans spokes into the product hub and ignores other products

### csharpAnalyzer

#### CSharpAnalyzer Strategy

- ✅ supports cs
- ✅ creates node with default properties
- ✅ computes container info from C# namespaces

### csharpGrouping

#### csharpGrouping

##### classifyCSharpContainer

- ✅ maps Ordering.API (ordering-api) → rest-api
- ✅ maps OrderProcessor (orderprocessor) → background-worker
- ✅ maps WebApp (webapp) → web-app
- ✅ maps ClientApp (clientapp) → web-app
- ✅ maps EventBus (eventbus) → event-broker
- ✅ maps Shared (shared) → container

##### isCSharpSourcePath

- ✅ detects .cs paths case-insensitively

##### nodeTypePriority

- ✅ ranks rest-api above relational-database and default

##### resolveCSharpComponent

- ✅ returns null for boilerplate files
- ✅ rolls up files by the first folder under the project
- ✅ keeps project-root files as leaf components
- ✅ rolls up .NET test projects by folder under the test project

##### shouldSkipCSharpFile

- ✅ skips GlobalUsings, Migrations, Designer, and ModelSnapshot files
- ✅ keeps architectural sources

### d3HierarchyLayout

#### D3HierarchyLayoutAdapter

- ✅ places tree children below the root
- ✅ roots context layout at the person node when present

### dagreLayout

#### DagreLayoutAdapter

- ✅ layouts a connected pair with dagre (top-left coords)
- ✅ falls back to a grid for sparse container diagrams
- ✅ ignores edges that reference missing nodes

#### layoutAsGrid

- ✅ places production nodes before tests in a stable grid

#### shouldUseGrid

- ✅ uses a grid for empty or disconnected graphs
- ✅ uses a grid when edge density is low

### externalDependenciesPass

#### applyExternalDependenciesPass

- ✅ rewrites component schemas with unresolved external proxy nodes only
- ✅ rolls component couplings up onto containers.yaml as inter-container edges
- ✅ does not add component noise onto context.yaml
- ✅ is a no-op when the blueprints tree is empty

### forensicAnalyzer

#### ForensicAnalyzer

- ✅ correlates structure + history, classifies, and reports
- ✅ skips AST for cold files when minChurnForComplexity is set
- ✅ filters to hotspots only when requested

### gitignoreFilter

#### gitignoreFilter

- ✅ honours gitignore patterns instead of hardcoded folder names
- ✅ loads .gitignore from a project directory

### gitLogHistory

#### parseGitLogOutput

- ✅ parses null-separated commit records with paths

#### relativizeCommitPaths

- ✅ maps git-root paths onto a nested scan root

### gitProvenance

#### collectGitProvenance

- ✅ collects remote, branch, commit, and scanRoot offset
- ✅ returns undefined when not inside a git repository
- ✅ omits remoteUrl when origin is not configured

### goAnalyzer

#### GoAnalyzer Strategy

- ✅ supports go
- ✅ creates a node with Go technology
- ✅ marks test files
- ✅ derives container from last meaningful directory segment
- ✅ classifies http handler directories as rest-api
- ✅ skips generic top-level dirs (cmd, internal, pkg) and takes next segment
- ✅ returns null for files at root with only generic dirs

### hotspotScoring

#### computeHotspotScores

- ✅ returns empty map for empty input
- ✅ scores the red-zone file highest

#### minMaxNormalize

- ✅ returns 0 when max equals min
- ✅ maps endpoints to 0 and 1

### interactiveGitChoice

#### applyInteractiveGitChoice

- ✅ disables git forensics when user selects none
- ✅ keeps forensics enrich when user selects full
- ✅ does not override an explicit CLI --git plan when choice is skipped
- ✅ accepts InteractiveGitChoice mode union

#### shouldPromptForGit

- ✅ prompts in interactive mode when git was not decided via flags
- ✅ does not prompt when headless
- ✅ does not prompt when --git already set
- ✅ does not prompt when --no-git already set

### javaAnalyzer

#### JavaAnalyzer Strategy

- ✅ supports java, kt, and kts
- ✅ creates a Java node with correct technology
- ✅ creates a Kotlin node with correct technology
- ✅ marks test files
- ✅ derives container from package declaration (3rd segment onward)
- ✅ classifies controller packages as rest-api
- ✅ falls back to path when no namespace is present

### layoutPass

#### applyLayoutPass

- ✅ layouts nodes that are missing positions
- ✅ preserves existing positions when forceRelayout is false
- ✅ forceRelayout defaults to true and recomputes all positions
- ✅ is a no-op when the blueprints tree is empty
- ✅ uses contextLayout for context-level schemas and dagre layout for others

### layoutWithPreservation

#### layoutWithPreservation

- ✅ preserves previous positions and only layouts gap nodes
- ✅ forceRelayout layouts the full set
- ✅ skips the layout engine when every node already has a position

### loadAnalysisConfig

#### loadAnalysisConfig

- ✅ returns defaults when no config file exists
- ✅ loads blueprint.config.json ignore and rollupModules
- ✅ loads blueprint.config.yml
- ✅ merges CLI ignore overrides onto file config

### nodeFileSystem

#### NodeFileSystemAdapter

- ✅ should verify file exists, write to files, and delete files
- ✅ should create directories and handle package.json name reading
- ✅ should support path and directory lookups

### nodeTypeHydrator

#### nodeTypeHydrator

- ✅ classifies UI packages as gateway-api
- ✅ classifies database imports and DbContext construction
- ✅ classifies event brokers from imports or class names
- ✅ classifies API controllers from imports or filename markers (language-agnostic)
- ✅ prefers rest-api over database when *Api.cs also has EF usings
- ✅ classifies IntegrationEventHandler paths as event-broker
- ✅ falls back to background-worker when no markers match
- ✅ hydrates an existing node in place
- ✅ maps dependency edge types from the target node

### parseBlueprintArgv

#### parseBlueprintArgv (git options)

- ✅ defaults to architecture with git forensics enabled
- ✅ disables git forensics with --no-git
- ✅ keeps git forensics enabled with --git
- ✅ treats --git-only as headless architecture plus forensics enrich
- ✅ parses --git-since
- ✅ maps legacy forensics subcommand to arch + git enrich
- ✅ keeps architecture interactive when only --git is set
- ✅ exposes architecture flag overrides and keeps git on by default
- ✅ defaults to relayout and disables with --no-relayout

#### parseBlueprintArgv plan shape

- ✅ returns a typed plan object

### pulumiAnalyzer

#### PulumiAnalyzer

- ✅ parses a pulumi project and writes containers.yaml + context node
- ✅ links multiple pulumi projects under one Infrastructure hub
- ✅ no-ops when no pulumi projects exist

### pulumiDiscovery

#### discoverPulumiRoots

- ✅ finds a project with Pulumi.yaml and yaml resources
- ✅ collects TypeScript sources for nodejs runtime
- ✅ skips nested projects under an outer root
- ✅ returns empty when no Pulumi projects exist

### pythonAnalyzer

#### PythonAnalyzer Strategy

- ✅ supports py
- ✅ creates node with default properties

### sourcePathFilter

#### sourcePathFilter

- ✅ skips structural noise paths by default
- ✅ applies extra config ignore globs
- ✅ honours include allow-lists when provided
- ✅ still honours .gitignore via the composite filter

### systemDiscovery

#### systemDiscovery

- ✅ extracts workspace roots from globs
- ✅ parses npm and pnpm workspace declarations
- ✅ discovers a product hub plus workspace/standalone spokes
- ✅ withProductHub does not link different products together
- ✅ respects explicit systems config override and still adds a product hub
- ✅ falls back to a single system when no workspaces or standalone packages exist
- ✅ partitions files by longest matching system root

### temporalCoupling

#### computeTemporalCoupling

- ✅ flags pairs above threshold with enough shared commits
- ✅ excludes pairs below shared-commit floor

#### couplingScore

- ✅ uses Jaccard-style formula
- ✅ returns 0 when denominator is non-positive

### terraformAnalyzer

#### TerraformAnalyzer

- ✅ parses a terraform root and writes containers.yaml + context node
- ✅ links multiple terraform roots under one Infrastructure hub
- ✅ no-ops when no terraform roots exist

### terraformDiscovery

#### discoverTerraformRoots

- ✅ finds a root with .tf files and skips nested module dirs
- ✅ uses infrastructure systemId when scan root itself has .tf files
- ✅ returns empty when no terraform files exist

### testPath

#### detectTestFramework

- ✅ detects JS/TS frameworks from imports
- ✅ detects Python frameworks
- ✅ detects .NET frameworks
- ✅ detects Java/Kotlin frameworks
- ✅ detects Go testing stdlib and testify
- ✅ detects jest from path token when no imports
- ✅ returns null for production code with no test imports

#### testPath

- ✅ marks unit test files and test directories
- ✅ marks .NET, Go, Java, and Python test conventions
- ✅ recognises dedicated test-project folder segments

### treeSitterParser

#### TreeSitterParserAdapter

- ✅ should parse imports, instantiations, and calls from TypeScript files
- ✅ should parse imports, instantiations, and calls from Python files
- ✅ should parse imports, instantiations, and calls from C# files
- ✅ should parse imports, package, and calls from Java files
- ✅ should parse imports, package clause, and calls from Go files
- ✅ records C# object creation and base types, not parameter or field type annotations

### treeSitterWasmPaths

#### treeSitterWasmPaths

- ✅ resolves c_sharp WASM from the installed tree-sitter-wasms package
- ✅ includes the compiled binary directory in search paths
- ✅ deduplicates search dirs
- ✅ returns null when no WASM exists for the language

### tsMorphComplexity

#### countCyclomaticComplexity

- ✅ counts decision points from a fixture

#### countLocAndSloc

- ✅ counts physical and source lines

### tsMorphParser

#### TsMorphParserAdapter

- ✅ should parse imports, instantiations, and calls from TypeScript files
- ✅ should identify test files correctly
- ✅ should include files under test directories and mark them as tests

### typescriptAnalyzer

#### TypeScriptAnalyzer Strategy

- ✅ supports ts, tsx, js, jsx
- ✅ creates node with correct properties
- ✅ computes container info correctly

## Core

### entityRef

#### entityRef Rules

##### getSchemaEntityRef

- ✅ should return id/entityRef if it is set
- ✅ should fallback to workspaceName or schema.name when entityRef/id is default

##### isEntityRef

- ✅ should identify valid entity references and filter out file paths

##### resolveShortEntityRef

- ✅ should append short refs under a scoped systemId
- ✅ should not double-prefix when systemId is the context root
- ✅ should prefix with context when systemId is a local container slug
- ✅ should pass through existing FQNs

##### resolveWorkspaceEntityRefs

- ✅ should correctly resolve FQN references across container and component hierarchies
- ✅ should correctly resolve FQN references using schema entityRef parent linkage
- ✅ should prefix all levels with context slug when a context file is present
- ✅ should not double-prefix stale dependency refs on context diagrams

### graph

#### dedupeDependencies

- ✅ keeps the first edge for each from→to pair

#### Graph Validation & Cycle Detection

- ✅ should validate a clean, acyclic graph
- ✅ should detect a direct cycle (A -> A)
- ✅ should detect a multi-node cycle (A -> B -> C -> A)
- ✅ should detect cycles in disconnected subgraphs

#### toSystemSchemaJsonSchema

- ✅ exports Draft-07 JSON Schema as a v3 object document with metaData

#### YAML Schema Parsing and Serialization

- ✅ should parse valid YAML into SystemSchema model
- ✅ should throw validation errors for YAML with invalid node types
- ✅ should throw validation errors for YAML with malformed node IDs
- ✅ should serialize SystemSchema model to a v3 object with metaData
- ✅ should round-trip metaData.source provenance in YAML
- ✅ should parse v3 YAML with metaData into SystemSchema
- ✅ should parse both legacy object-root and sequence-root YAML
- ✅ should parse and serialize isTest flag
- ✅ should serialize SystemSchema model to valid Mermaid code and handle keyword conflicts
- ✅ should accept container node type from CLI-generated schemas

##### C4 Model Validation & Serialization Extensions

- ✅ should parse C4 properties from valid YAML schema
- ✅ should accept legacy schema id alias when it is a valid entityRef
- ✅ should reject path-style schema identity
- ✅ should serialize C4 properties to valid YAML and Mermaid
- ✅ should parse and round-trip node forensics
- ✅ should reject invalid forensics classifications

### iacImport

#### detectIacSourceKind

- ✅ detects terraform hcl from path and content
- ✅ detects pulumi yaml from project file name
- ✅ detects pulumi typescript from imports

#### parseIacBatchToSchema

- ✅ merges multiple terraform files
- ✅ rejects mixed terraform and pulumi vendors

#### parseIacToSchema

- ✅ parses terraform hcl through the unified entrypoint
- ✅ parses pulumi yaml through the unified entrypoint

#### vendorForKind

- ✅ maps kinds to vendors

### iacResourceMap

#### mapProviderTypeToNodeType

- ✅ maps aws_rds_instance → relational-database
- ✅ maps azurerm_mssql_database → relational-database
- ✅ maps google_sql_database_instance → relational-database
- ✅ maps aws_dynamodb_table → database
- ✅ maps aws_elasticache_cluster → cache-store
- ✅ maps azurerm_redis_cache → cache-store
- ✅ maps aws_msk_cluster → event-broker
- ✅ maps aws_sns_topic → event-broker
- ✅ maps aws_sqs_queue → event-broker
- ✅ maps aws_lambda_function → serverless-function
- ✅ maps google_cloudfunctions_function → serverless-function
- ✅ maps azurerm_function_app → serverless-function
- ✅ maps aws_ecs_service → microservice
- ✅ maps azurerm_container_app → microservice
- ✅ maps aws_lb → gateway-api
- ✅ maps aws_api_gateway_rest_api → gateway-api
- ✅ maps aws_cloudfront_distribution → gateway-api
- ✅ defaults unknown types to container and marks unknown

### layoutMerge

#### hasFinitePosition

- ✅ requires finite x and y

#### mergeLaidOutGapNodes

- ✅ places gap cluster to the right of preserved bbox with gap
- ✅ keeps gap layout as-is when nothing is preserved

#### mergeLayoutPositions

- ✅ preserves existing positions and only layouts gap nodes
- ✅ forceRelayout ignores previous positions

#### nodesNeedingLayout

- ✅ returns nodes missing a finite position

#### preservedBoundingBox

- ✅ returns null when no preserved positions
- ✅ computes min/max over finite positions

#### seedPreservedPositions

- ✅ copies finite positions and strips coords from new nodes

### mermaidImport

#### extractMermaidFromMarkdown

- ✅ extracts the first mermaid fenced block
- ✅ is case-insensitive on the fence language tag
- ✅ returns trimmed input when no fence is found
- ✅ returns trimmed input when fence opener has non-whitespace junk
- ✅ skips an invalid mermaid-prefixed fence and uses a later valid one

#### parseMermaidToSchema — C4

- ✅ parses C4Context with Person, System, and Rel
- ✅ parses C4Container with ContainerDb and external systems
- ✅ parses C4Component diagram
- ✅ parses directed Rel variants and ignores malformed Rel lines

#### parseMermaidToSchema — flowchart

- ✅ parses a simple graph TD with nodes and edges
- ✅ parses labeled edges with descriptions
- ✅ parses publish-subscribe edges from dotted arrows
- ✅ infers event-broker from diamond shape
- ✅ warns when subgraph blocks are flattened
- ✅ defaults component type at component level
- ✅ strips person emoji and (External) suffix from flowchart labels
- ✅ throws on unrecognised diagram type

### ownership

#### buildOwnershipBreakdown

- ✅ derives concentration from authors list
- ✅ classifies solo ownership

#### rollupForensicAuthors

- ✅ sums commits per email across children

### path

#### Domain Path Utilities

##### getFileName

- ✅ should extract filename correctly from paths

##### resolveRelativePath

- ✅ should resolve standard relative files in same folder
- ✅ should resolve subfolders correctly
- ✅ should traverse up directories using ..
- ✅ should return absolute path if input is absolute or web url

### pulumiImport

#### extractPulumiFromMarkdown

- ✅ extracts the first yaml/yml/pulumi fenced block
- ✅ accepts bare fences and yml/pulumi language tags
- ✅ returns trimmed input when no fence is found

#### parsePulumiBatchToSchema

- ✅ merges resources across files and resolves cross-file refs
- ✅ fails on duplicate addresses across files

#### parsePulumiToSchema — TypeScript

- ✅ maps new aws resources from TypeScript source

#### parsePulumiToSchema — YAML

- ✅ maps a single lambda resource to a scoped node
- ✅ creates an edge from a property reference
- ✅ creates an edge from dependsOn in options
- ✅ marks get resources as external data sources
- ✅ warns and defaults unknown resource types
- ✅ warns on unresolved refs without failing
- ✅ returns empty schema for project metadata only
- ✅ throws on invalid YAML

### refactorBoundary

#### buildRefactorBoundary

- ✅ expands a component seed via temporal coupling
- ✅ builds container rollup from high-refactor children
- ✅ flags cross-container members
- ✅ returns undefined when seed is missing

### refactorScore

#### computeRefactorScore

- ✅ weights complexity, churn, and distributed ownership
- ✅ treats missing ownership as zero concentration

### schema

#### End-to-End Schema Validation Test

- ✅ should naturally flow slugified strings through integrated dependency configurations

#### EntityRef Utilities with Unified Parsing

##### getLevel()

- ✅ should resolve C4 levels perfectly from slugified outputs
- ✅ should throw an error if evaluated path exceeds 4 segments or has no segments

##### leaf()

- ✅ should correctly retrieve the last segment from an EntityRef

##### parse()

- ✅ should correctly parse and slugify a root context reference when parent is not provided
- ✅ should correctly parse, slugify, and nest under parent reference when parent is provided
- ✅ should throw an error if the value input is missing or empty

#### slugify Helper Utility

- ✅ should transform spaces to hyphens and drop special characters

### schemaMerge

#### applyImportMergePlan

- ✅ merges additions without touching existing nodes
- ✅ skips conflicting nodes by default
- ✅ overwrites conflicting nodes when resolution is overwrite
- ✅ preserves forensics and properties when overwriting
- ✅ renames conflicting nodes when resolution is rename
- ✅ deduplicates identical edges

#### computeImportMergePlan

- ✅ identifies additions when imported nodes are new
- ✅ detects conflicts when entityRef matches but fields differ
- ✅ treats identical nodes as unchanged

### schemaVersion

#### schemaVersion

- ✅ builds versioned and latest public URLs
- ✅ parses schema contract majors from URLs and legacy semver
- ✅ assessSchemaVersion returns null when compatible
- ✅ assessSchemaVersion flags legacy semver and older majors
- ✅ assessSchemaVersion flags newer majors
- ✅ assessSchemaVersion flags unrecognized version strings
- ✅ builds a fetchable language-server URL and directive

### slug

#### Slug utility tests

- ✅ should convert workspace names to clean URL slugs
- ✅ should treat dots as separators for namespaces and package-like ids

### sourceProvenance

#### buildSourceFileRawUrl

- ✅ builds a GitHub raw URL with scanRoot offset
- ✅ builds a GitLab raw URL

#### buildSourceFileUrl

- ✅ builds a GitHub blob URL pinned to scannedAtCommit
- ✅ builds a GitLab blob URL
- ✅ returns undefined when remoteUrl is missing

#### normalizeGitRemoteUrl

- ✅ converts SCP-style git@ URLs to HTTPS
- ✅ strips .git suffix from HTTPS remotes
- ✅ returns undefined for empty input

#### resolveRepoRelativeFilePath

- ✅ joins scanRoot with node filepath when scan root is a subdirectory
- ✅ returns filepath unchanged when scanRoot is root

### terraformImport

#### extractTerraformFromMarkdown

- ✅ extracts the first hcl/tf/terraform fenced block
- ✅ accepts bare fences and tf/terraform language tags
- ✅ returns trimmed input when no fence is found

#### parseTerraformBatchToSchema

- ✅ merges resources across files and resolves cross-file refs
- ✅ fails on duplicate addresses across files

#### parseTerraformToSchema — HCL resources

- ✅ maps a single lambda resource to a scoped node
- ✅ creates an edge from depends_on
- ✅ creates an edge from an attribute reference
- ✅ marks data sources as external
- ✅ marks remote modules as external
- ✅ marks local modules as non-external
- ✅ warns and defaults unknown resource types
- ✅ warns on unresolved refs without failing
- ✅ emits one representative node for for_each
- ✅ returns empty schema for provider-only files
- ✅ throws on invalid HCL

#### parseTerraformToSchema — JSON

- ✅ maps .tf.json resources like HCL

### trends

#### bucketAuthorActivity

- ✅ groups author counts into solo, pair, and team bands

#### bucketComplexityCounts

- ✅ groups complexities into display bands

#### rollupChurnByWeek

- ✅ sums aligned weekly buckets across series
- ✅ pads shorter series with implicit zeros
- ✅ returns undefined when no series have data

### workspaceCatalog

#### workspaceCatalog

- ✅ derives entityRef from schema name when missing

### workspaceExternals

#### workspaceExternals

##### buildWorkspaceEntityIndex

- ✅ indexes every node across workspace schemas

##### computeExternalNodePositions

- ✅ returns non-overlapping grid positions

##### enrichSchemaWithExternals

- ✅ materializes suggested cross-container components and neighbor containers
- ✅ is idempotent when externals are already present
- ✅ on container diagrams only materializes container-level externals
- ✅ on context diagrams never materializes component-level noise
- ✅ unresolved mode only adds dangling dependency endpoints
- ✅ skips context schemas when enrichLevels excludes them

##### enrichWorkspaceWithExternals

- ✅ enriches every schema using a shared workspace index
- ✅ rolls component-level cross-container deps up onto the container diagram

##### listExternalCandidates

- ✅ lists sibling containers and cross-container components for a component diagram
- ✅ lists cross-container components on container diagrams
- ✅ filters by source schema level
- ✅ filters by node type and search text
- ✅ excludes entities already on the active diagram

##### materializeExternalNodes

- ✅ creates external proxy nodes with canonical refs and layout positions

##### suggestExternalDependencies

- ✅ suggests related containers from parent container diagram
- ✅ suggests cross-container components referenced from other diagrams
- ✅ suggests unresolved dependency endpoints in the active schema

## Designer

### ActionControls

#### ActionControls Component

- ✅ shows pending changes button only when hasPendingChanges is true
- ✅ renders correctly when workspace is closed
- ✅ renders correctly when workspace is open
- ✅ triggers openWorkspaceDirectory on clicking Open Folder
- ✅ triggers loadSchema on clicking Open File
- ✅ triggers saveSchema on clicking Save Schema when workspace is closed
- ✅ triggers saveActiveDiagram on clicking Save when workspace is open
- ✅ triggers initSchema on clearing canvas if confirmed
- ✅ does not trigger initSchema on clearing canvas if not confirmed
- ✅ disables buttons when isLoading is true
- ✅ disables undo button when past history is empty, enables and triggers action when filled
- ✅ disables redo button when future history is empty, enables and triggers action when filled

### App

#### App Layout and Collapsible Panels

- ✅ should have panels hidden by default and support toggling them
- ✅ should synchronize window URL pathname to /workspace/[slug] based on workspaceName or schema.name
- ✅ should switch systems in store when popstate event fires with a different slug

### AppHeader

#### AppHeader

- ✅ shows a burger menu on mobile and reveals navigation links
- ✅ closes the mobile menu when a link is selected
- ✅ closes the mobile menu when Escape is pressed

### BlueprintNode

#### BlueprintNode Component

- ✅ renders correctly with basic node details
- ✅ simplifies chrome when liteCanvas is on but keeps all edge handles mounted
- ✅ keeps full chrome when zoomed out unless liteCanvas is on
- ✅ shows HOT and SILO badges for concerning forensics
- ✅ shows COUPLED badge when couplingHighlight is set
- ✅ exposes hotspot heat intensity for styling when heatmap is active
- ✅ does not mark heat when intensity is zero
- ✅ truncates long entityRefs while exposing the full value in the title tooltip
- ✅ triggers store selectNode when clicked
- ✅ renders TEST badge when node represents a test component
- ✅ renders (External) indicator and styling when external is true
- ✅ shows Zoom indicator when node has a sub-diagram link in loadedSystems
- ✅ triggers navigation to node entityRef when Zoom button is clicked
- ✅ shows a Code button when the node has a filepath and opens the source modal

### Breadcrumbs

#### Breadcrumbs Component

- ✅ renders Sandbox Workspace name when no workspace folder is open
- ✅ renders specific workspace name when workspace directory is loaded
- ✅ renders active diagram breadcrumbs and ancestor system breadcrumbs
- ✅ renders correct href links for ancestor breadcrumbs
- ✅ renders next hierarchy level preview when a node with next level component schema is selected
- ✅ renders dropdown button with child components and triggers selectSystem when child is clicked
- ✅ renders zoom preview segment for container level zoom from context level

### BreadcrumbsCompact

#### BreadcrumbsCompact

- ✅ shows a compact summary and opens the full trail in a menu
- ✅ shows ancestor trail inside the mobile menu

### browserNetworkStatus

#### BrowserNetworkStatusAdapter

- ✅ isOnline mirrors navigator.onLine
- ✅ notifies subscribers on online/offline events and unsubscribes cleanly

### buildCouplingOverlayEdges

#### applyCouplingHighlights

- ✅ marks coupled peer nodes when enabled
- ✅ clears highlights when disabled

#### buildCouplingOverlayEdges

- ✅ returns no edges when overlay is disabled
- ✅ builds labeled coupling edges when enabled

#### filterCouplingFocusNodes

- ✅ keeps only the selected node and coupled peers when enabled
- ✅ returns all nodes when disabled
- ✅ returns all nodes when there are no resolvable peers

### buildForensicsTrendDashboard

#### buildForensicsTrendDashboard

- ✅ builds component-level trends from direct forensics
- ✅ rolls up descendant trends for containers
- ✅ returns undefined when there is no chartable data

#### collectDescendantForensics

- ✅ collects components under a container by entityRef prefix and containerId

### buildId

#### formatAppVersionLabel

- ✅ formats major.minor from package version plus build id

#### parseBuildIdFromHtml

- ✅ reads app-build-id meta tag from html
- ✅ returns null when meta tag is missing

### Canvas

#### Canvas Component

- ✅ renders canvas layout with correct count of nodes and edges
- ✅ hides MiniMap and Background when liteCanvas is on
- ✅ caps edge animation to selection neighborhood when liteCanvas is on
- ✅ focuses coupling neighbors and hides other nodes and schema links
- ✅ hides external nodes when showExternals is off
- ✅ keeps selected node and transitive upstream + downstream deps when focus toggle is on
- ✅ applies hotspot heat to nodes when showHotspotHeatmap is on
- ✅ displays cycle warning validation status badge when cycle is present
- ✅ renders system switcher dropdown when multiple loaded systems exist
- ✅ triggers selectSystem when selecting another system in dropdown
- ✅ triggers openWorkspaceDirectory store action when Open Folder is clicked
- ✅ renders error alert notification toast when lastError is set
- ✅ triggers zoomIntoNode store action on double clicking a C4 node
- ✅ navigates to parent system when Escape is pressed
- ✅ navigates to parent system when Backspace is pressed
- ✅ shows a Zoom out button that navigates to the parent system

### CodeViewer

#### CodeViewer UI Component

- ✅ should render the Schema Explorer header and tabs
- ✅ should render the initial schema in the YAML code block
- ✅ should switch tabs and show JSON schema representation
- ✅ should support YAML direct edit and apply workflow
- ✅ should support JSON direct edit and apply workflow
- ✅ should show error when applying invalid YAML configuration
- ✅ should show error when applying invalid JSON configuration
- ✅ should support Mermaid preview toggle and render mock visual preview
- ✅ should open mermaid import dialog from the mermaid tab
- ✅ should filter test components from YAML, JSON, and Mermaid views based on showTests state

### compareSystemSchemas

#### compareSystemSchemas

- ✅ returns empty diff for identical schemas
- ✅ detects added, modified, and deleted nodes

### computeClientLayout

#### computeClientLayout

- ✅ normalizes missing sizes and delegates to the registry engine
- ✅ uses measured dimensions when present
- ✅ applies grid policy without calling the engine when sparse
- ✅ falls back to grid when the registry has no engine

#### shouldUseGrid

- ✅ uses grid for empty edge sets
- ✅ uses an engine when edges are dense enough

### concern

#### evaluateForensicsConcern

- ✅ returns none for undefined or empty forensics
- ✅ marks hotspot classification as danger
- ✅ marks knowledge-silo as warning and combines with hotspot as danger
- ✅ uses secondary thresholds when classifications are absent

### countForensicsMetrics

#### countSchemaForensicsMetrics

- ✅ counts diagram-wide externals, tests, and dependencies when nothing is selected
- ✅ counts partners and incident edges for a selected node
- ✅ returns zeros for an unknown selection

### CouplingMiniGraph

#### CouplingMiniGraph

- ✅ calls onPeerClick for linked peers only

### d3HierarchyLayoutAdapter

#### D3HierarchyLayoutAdapter

- ✅ places tree children below the root

### dagreLayoutAdapter

#### DagreLayoutAdapter

- ✅ places a chain top-to-bottom

### db

#### db.ts - IndexedDB Client Operations

- ✅ should successfully save baseline schemas and dependencies
- ✅ should compute an empty diff when baseline and working schemas match
- ✅ should detect added components and connections in working schema
- ✅ should detect deleted components and connections in working schema
- ✅ should detect modified properties, name or type of components
- ✅ should detect position changes of components
- ✅ should revert draft changes back to baseline

### defaultIdbSeed

#### defaultIdbSeed

- ✅ seeds when path has no stored data
- ✅ skips paths that already have IndexedDB data
- ✅ stops when seed is cancelled (workspace opened)

### DesignSystemPage

#### DesignSystemPage Component

- ✅ should render the design system showcase

### DesignSystemShowcase

#### DesignSystemShowcase Component

- ✅ renders title and navigation
- ✅ supports switching tabs

### diagramState

#### diagramState Actions & State Management

- ✅ should initialize with correct default nodes, edges, and schemas
- ✅ preserves metaData.source through initSchema and canvas rebuild
- ✅ should successfully add a new node and serialize to YAML
- ✅ should delete a node and clean up referencing edges
- ✅ should update a node name and metadata properties
- ✅ should rename a node ID and update referencing edges
- ✅ should rename a context-level actor and update dependency refs
- ✅ should update dependency refs when renaming after entityRef was resolved to FQN
- ✅ should update edges that reference the old FQN when renaming a node
- ✅ should update edges when canvas id is short but dependency uses resolved FQN
- ✅ should establish a connection between nodes and detect a cycle
- ✅ should allow updating schema name and level
- ✅ should map isTest flag correctly from domain node to RF node data
- ✅ should write layout engine positions into schema and YAML
- ✅ should support undo and redo basic workflow
- ✅ should support undo on node property updates
- ✅ should support undo on node deletion
- ✅ should place a new node at the specified position if provided
- ✅ should reset focusedCyclePath to null when initSchema is called
- ✅ should merge mermaid import into active diagram without removing existing nodes
- ✅ should preview mermaid import merge plan

### DiffMenu

#### DiffMenu Component

- ✅ is hidden when isOpen is false
- ✅ renders up to date message when there are no structural differences
- ✅ displays added, modified, and deleted component nodes and connections
- ✅ triggers revert schema operations and calls initSchema when Revert is confirmed
- ✅ triggers commit schema operations and calls saveActiveDiagram when Commit is clicked

### DocsPage

#### DocsPage feature filter

- ✅ filters the feature report as the user types
- ✅ filters to a package when a package chip is clicked without filling the search box

### DocsShell

#### DocsShell

- ✅ shows separate mobile scrollers for product guide and reference

### elkLayoutAdapter

#### ElkLayoutAdapter

- ✅ places a chain top-to-bottom

### fetchSourceFileContent

#### fetchSourceFileContent

- ✅ prefers local workspace content when available
- ✅ falls back to raw URL when local read fails
- ✅ returns a helpful error when no source metadata exists

### fileSync

#### fileSync Adapters

##### BrowserFileSystemAdapter (FileSystemPort)

###### loadSchema

- ✅ uses showOpenFilePicker if available in window
- ✅ falls back to file input click if showOpenFilePicker is not supported

###### saveSchema

- ✅ uses showSaveFilePicker if available in window
- ✅ falls back to browser anchor tag download if showSaveFilePicker is not supported

##### BrowserWorkspaceAdapter (WorkspacePort)

- ✅ selectDirectory prompts showDirectoryPicker and saves active handle
- ✅ hasPermission queries and requests browser file handle permissions
- ✅ readDirectoryFiles reads top-level .yaml and .yml files from active handle
- ✅ readDirectoryFiles traverses child directories recursively and reads all yaml files
- ✅ readFile splits path and traverses directory handle recursively to return content
- ✅ writeFile creates directory structure and file handles to write content

### filterFeatureMarkdown

#### filterFeatureMarkdown

- ✅ returns the original markdown when the query is empty
- ✅ keeps matching list items and their ancestor headings
- ✅ keeps all descendants under a matching heading
- ✅ keeps parent package/file headings when a nested suite matches
- ✅ counts matching feature list items
- ✅ package mode keeps only the matching top-level ## section

### filterSelectedDependencyFocus

#### filterSelectedDependencyFocus

- ✅ collects selected node plus transitive upstream and downstream neighbors
- ✅ includes upstream dependents when selecting a mid-chain node
- ✅ includes all transitive upstream callers when selecting a leaf
- ✅ does not include sibling-only branches via a shared upstream
- ✅ filters nodes when enabled; passes through when disabled or unselected
- ✅ keeps upstream callers when focusing a dependency target

### ForensicsPage

#### ForensicsPage

- ✅ renders ranked offenders and filters to hotspots
- ✅ filters refactor candidates by heuristic score
- ✅ filters the ranking list from the page search
- ✅ opens refactor plan slide-over when an offender row is clicked

### ForensicsSection

#### ForensicsSection

- ✅ renders readonly metrics and hotspot concern badge
- ✅ shows knowledge silo badge
- ✅ toggles canvas coupling overlay when peers are linked
- ✅ disables coupling toggle when no peers are on the diagram
- ✅ renders trend dashboard with churn sparkline and coupling mini graph
- ✅ renders ownership breakdown when authors are present
- ✅ selects coupled peer from mini graph when linked
- ✅ shows helper text for the section and each metric

### ForensicsTrendPanel

#### ForensicsTrendPanel

- ✅ renders churn, author, and complexity micro charts for rollups

### Header

#### Header Component

- ✅ renders branding and breadcrumbs
- ✅ displays the C4 level badge
- ✅ displays valid status badge when validation is successful
- ✅ displays cycle warning validation status badge when cycle is present
- ✅ displays schema version warning badge when loaded version mismatches app expectation

### hotspotHeatmap

#### applyHotspotHeatmap

- ✅ sets transient hotspotHeat from scores when enabled
- ✅ clears heat when disabled

#### hotspotHeatIntensity

- ✅ returns 0 when forensics is missing
- ✅ returns 0 when hotspotScore is missing
- ✅ returns the score when in range
- ✅ clamps out-of-range scores

#### hotspotHeatmapMinimapColor

- ✅ returns null for zero intensity
- ✅ returns a red-scale hex for positive intensity

### hydrateSandboxDrafts

#### hydrateSandboxDrafts

- ✅ restores draft positions when topology matches
- ✅ keeps memory schema when no draft exists

### importIac

#### previewIacImport

- ✅ returns parse result and merge plan for terraform resources

### importMermaid

#### previewMermaidImport

- ✅ returns parse result and merge plan for new nodes

### ioState

#### ioState Actions & State Management

- ✅ should open workspace, read blueprint.yaml, and mark workspace as open
- ✅ should catalog all systems on open and lazy-load when selecting another

##### loadSchema error handling

- ✅ should load content and return true on successful parsing
- ✅ should return false if loadSchema is cancelled by user
- ✅ should return false if loadSchema throws

##### openWorkspaceDirectory edge cases

- ✅ should fail if no files are returned from workspace
- ✅ should log/skip invalid schemas and continue if at least one schema is valid
- ✅ should fail if all schema files fail to parse
- ✅ discards IndexedDB drafts whose topology no longer matches disk YAML

##### saveActiveDiagram logic

- ✅ should delegate to saveSchema when workspace is not open
- ✅ should write to file successfully when workspace is open
- ✅ should return false if writeFile fails or throws when workspace is open

##### saveSchema error handling

- ✅ should return false if saveSchema port operation fails
- ✅ should return false and log error if saveSchema throws

### LayoutEngineControls

#### LayoutEngineControls

- ✅ starts with no engine selected and updates store on change

### layoutUtils

#### layoutUtils forensics plumbing

- ✅ maps node forensics onto RF node data
- ✅ preserves forensics when rebuilding schema from canvas
- ✅ preserves git source provenance when rebuilding schema from canvas

#### mapDomainDepsToRFEdges

- ✅ drops duplicate from→to edges that would share a React key

### layoutUtils.direction

#### dependency edge direction visuals

- ✅ maps domain deps with a closed arrow marker toward the target
- ✅ keeps publish-subscribe edges animated by default
- ✅ animates edges incident to the selected node
- ✅ animates all edges when selected-dependencies focus mode is on
- ✅ preserves already-animated edges
- ✅ disables all edge animation when preferReducedMotion is set
- ✅ caps liteCanvas animation to edges incident to the selection

### lazyLayoutEngine

#### lazyLayoutEngine

- ✅ does not call the loader until computeLayout runs
- ✅ reuses the loaded adapter on subsequent calls

### LiveSchemaPreview

#### LiveSchemaPreview

- ✅ fetches latest schema and renders pretty JSON
- ✅ shows an error when the channel is invalid
- ✅ shows an error when fetch fails

### MermaidPreview

#### MermaidPreview Component

- ✅ renders loading state initially then displays rendered SVG
- ✅ displays visualization error when render fails
- ✅ opens and closes expanded portal view

### MobilePanelToggles

#### MobilePanelToggles

- ✅ opens the schema panel from a labelled button
- ✅ opens the properties panel from a labelled button
- ✅ hides when a panel sheet is already open

### OfflineBanner

#### OfflineBanner

- ✅ is hidden when network status reports online
- ✅ shows when network status reports offline on mount
- ✅ toggles when the network status port notifies changes

### pages

#### docs link resolution

- ✅ resolves relative markdown links within the guide
- ✅ registers the Blueprint Schema guide page
- ✅ resolves absolute docs paths
- ✅ resolves feature report pages
- ✅ resolves in-app workspace links
- ✅ maps screenshot assets under /docs-assets

#### stripHtmlComments

- ✅ removes HTML comments used as reporter placeholders

### PropertyPanel

#### PropertyPanel UI Component

- ✅ should render External Dependencies section when no node is selected and workspace is loaded
- ✅ should render Workspace config and Catalog when no node is selected
- ✅ should render Diagram C4 Level selector and trigger updateSchemaLevel on change
- ✅ should render read-only Diagram entityRef from workspaceName or schema.name
- ✅ should trigger node creation when catalog component is clicked
- ✅ should show validation success message when architecture is acyclic
- ✅ should hide validation success when connection issues exist
- ✅ should show cycle warning alert when circular dependency is triggered
- ✅ should display node attributes editor when a node is selected
- ✅ should rename node and metadata attributes when edited in node details
- ✅ should allow adding custom metadata attributes to the component
- ✅ should allow editing active connection descriptions
- ✅ shows readonly git forensics when the selected node is enriched
- ✅ wires coupling toggle for a selected node with on-canvas peers
- ✅ toggles risk heatmap from workspace display controls
- ✅ toggles lite canvas from workspace display controls
- ✅ keeps risk heatmap toggle available while a node is selected

### rankOffenders

#### rankForensicsOffenders

- ✅ ranks component hotspots by score and classification
- ✅ filters hotspots and silos
- ✅ ranks refactor candidates by complexity × churn × (1 - ownership)
- ✅ includes dependency count as structural context on ranked rows
- ✅ ranks container rollups and ignores component diagrams in containers scope

### refactorScore

#### computeRefactorScore

- ✅ ranks complexity × churn × (1 - topAuthorPercent)
- ✅ treats missing ownership as zero concentration

### resetToEmptyWorkspace

#### resetToEmptyWorkspace

- ✅ clears sandbox systems and leaves a blank diagram

### resolveCouplingEdges

#### findNodeIdByFilepath

- ✅ resolves normalized filepaths to canvas node ids

#### resolveCouplingEdges

- ✅ returns empty when selected node has no coupled files
- ✅ maps coupledFiles paths to nodes on the canvas via properties.filepath
- ✅ normalizes path separators and leading ./ when matching
- ✅ returns empty when selected node is missing
- ✅ skips self-coupling if filepath matches the selected node

### resolveLiveSchemaUrl

#### resolveLiveSchemaUrl

- ✅ defaults empty channel to latest under /
- ✅ accepts latest and versioned channels
- ✅ joins with Vite BASE_URL when not root
- ✅ rejects path traversal and unknown channels

### schemaCompare

#### schemaCompare

- ✅ treats position-only differences as equal topology
- ✅ detects extra / changed dependencies
- ✅ keeps matching draft (with positions) on open
- ✅ discards topologically stale draft in favor of disk
- ✅ uses disk when there is no draft

### Searchbar

#### Searchbar Component

- ✅ renders search input with placeholder
- ✅ filters and displays nodes matching search query
- ✅ respects showTests filtering state
- ✅ handles clearing search input
- ✅ selects and centers node when dropdown item is clicked
- ✅ navigates dropdown using arrow keys and selects with Enter
- ✅ closes dropdown when Escape key is pressed

### SelectedDependencySection

#### SelectedDependencySection

- ✅ shows from/to refs, description, and dangling warning when endpoints missing
- ✅ lets the user edit dependency type

### SourceCodeDialog

#### SourceCodeDialog

- ✅ renders nothing when closed
- ✅ shows loaded source content when open

### StartupWorkspaceDialog

#### StartupWorkspaceDialog

- ✅ renders the startup choices when open
- ✅ does not expose the dialog when closed
- ✅ invokes the matching handler for each choice

### store

#### Blueprint Store Integration Helper Actions

- ✅ should resolve relative path correctly

#### Default Initial Schema & Hierarchical C4 Linking

- ✅ should verify initial default workspace structure

### SystemSelector

#### SystemSelector

- ✅ renders nothing when no systems are loaded
- ✅ renders system options and navigates on change

### uiState

#### uiState Actions & State Management

- ✅ should initialize with correct default UI state
- ✅ should set isDiffOpen value via setIsDiffOpen action
- ✅ should toggle showTests property via toggleShowTests action
- ✅ should toggle showExternals property via toggleShowExternals action
- ✅ should toggle showSelectedDependenciesOnly via toggleShowSelectedDependenciesOnly
- ✅ should toggle showCoupling property via toggleShowCoupling action
- ✅ should toggle showHotspotHeatmap via toggleShowHotspotHeatmap action
- ✅ should toggle liteCanvas via toggleLiteCanvas action
- ✅ should manage leftCollapsed and rightCollapsed panel states
- ✅ should set showDesignSystem value via setShowDesignSystem action
- ✅ should automatically expand right panel when a node is selected
- ✅ should initialize focusedCyclePath to null and set it via setFocusedCyclePath

### UpdateBanner

#### UpdateBanner

- ✅ is hidden when no update is pending
- ✅ shows refresh prompt when the service worker reports an update
- ✅ dismisses the banner when Later is clicked

### useImportIacDialog

#### useImportIacDialog

- ✅ applies ELK layout after a successful IaC import

### useImportMermaidDialog

#### useImportMermaidDialog

- ✅ applies ELK layout after a successful Mermaid import

### useKeyboardNavigation

#### useKeyboardNavigation Hook

- ✅ should call onSearchOpen when ⌘K is pressed (not typing)
- ✅ should call onSearchOpen when Ctrl+K is pressed (not typing)
- ✅ should call onSearchOpen when / is pressed (not typing)
- ✅ should call onZoomOut when Escape is pressed (not typing)
- ✅ should call onZoomOut when Backspace is pressed (not typing)
- ✅ should not call onZoomOut when typing in INPUT
- ✅ should not call onZoomOut when the callback is omitted
- ✅ should not trigger shortcuts when typing in INPUT
- ✅ should not trigger shortcuts when typing in TEXTAREA
- ✅ should not trigger shortcuts when typing in contenteditable element
- ✅ should call onUndo when ⌘Z or Ctrl+Z is pressed (not typing)
- ✅ should call onRedo when ⌘Shift+Z, Ctrl+Shift+Z, ⌘Y, or Ctrl+Y is pressed (not typing)
- ✅ should call onShortcutsOpen when ? is pressed (not typing)
- ✅ should cleanup event listener on unmount

### WorkspaceDisplayControls

#### WorkspaceDisplayControls

- ✅ exposes workspace-wide display toggles including selected-deps focus
- ✅ marks the summary when counts are scoped to the selected node

### WorkspacePage

#### WorkspacePage Component

- ✅ should render CodeViewer, Canvas, and PropertyPanel
- ✅ should support expanding and collapsing left and right side panels
- ✅ should synchronize workspace system selection from URL params
- ✅ should redirect route to slugified workspace name if on a workspace route and path mismatches
- ✅ resets to an empty workspace when Mermaid is chosen from startup
- ✅ does not show the startup chooser on deep-linked workspace routes
- ✅ shows the startup chooser on bare /workspace

## Reporters

### vitestFeatureReporter

#### VitestFeatureReporter

- ✅ maps project names to package labels
- ✅ nests output as Package → File → describe
- ✅ embeds into an existing file between placeholders
- ✅ marks failed and skipped tests with the correct icons

<!-- vitest-feature-reporter--end -->
