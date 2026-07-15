import type { DependencyType, NodeType, SystemNode } from '@blueprint/core';
import type { ParsedSourceFile } from './types.ts';

/**
 * Language-agnostic markers used to hydrate node types from parsed source signals.
 * Keyword lists intentionally span ecosystems (TS / .NET / Python / JVM-ish packages)
 * so classification does not depend on which parser produced the ParsedSourceFile.
 */
const UI_IMPORT_MARKERS = ['react', '@xyflow/react', 'vue', 'svelte', 'solid-js', '@angular/core'];

const DATABASE_IMPORT_MARKERS = [
  'prisma',
  'knex',
  'pg',
  'mongodb',
  'mongoose',
  'typeorm',
  'sequelize',
  'drizzle-orm',
  'sqlalchemy',
  'django.db',
  'psycopg',
  'entityframeworkcore',
  'microsoft.entityframeworkcore',
  'npgsql',
  'mysql',
];

const DATABASE_CLASS_MARKERS = [
  'PrismaClient',
  'MongoClient',
  'DbContext',
  'SqlAlchemy',
  'SessionLocal',
];

const EVENT_IMPORT_MARKERS = [
  'kafkajs',
  'bullmq',
  'amqplib',
  'mqtt',
  'ioredis',
  'redis',
  'confluent.kafka',
  'stackexchange.redis',
  'nats',
  '@nestjs/microservices',
];

const API_IMPORT_MARKERS = [
  'express',
  'fastify',
  '@nestjs/common',
  'koa',
  'hapi',
  'fastapi',
  'flask',
  'django.urls',
  'microsoft.aspnetcore',
  'aspnetcore',
];

export type NodeHydration = {
  type: NodeType;
  label: string;
  technology: string;
  /** Which rule family produced this classification (for tests / debugging). */
  reason: string;
};

function matchesAny(haystack: string, needles: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some(n => lower.includes(n.toLowerCase()));
}

function importMatches(file: ParsedSourceFile, markers: readonly string[]): boolean {
  return file.imports.some(imp => matchesAny(imp.moduleSpecifier, markers));
}

function classMatches(file: ParsedSourceFile, markers: readonly string[]): boolean {
  return (file.newExpressions || []).some(expr => matchesAny(expr.className, markers));
}

function pathAndNameHaystack(file: ParsedSourceFile): string {
  return `${file.relativePath} ${file.baseName}`.replace(/\\/g, '/');
}

function languagePrefix(file: ParsedSourceFile): string {
  const ext = file.relativePath.split('.').pop()?.toLowerCase() || '';
  if (ext === 'cs') return 'C#';
  if (ext === 'py') return 'Python';
  if (ext === 'js' || ext === 'jsx') return 'JavaScript';
  if (ext === 'java' || ext === 'kt') return 'JVM';
  if (ext === 'go') return 'Go';
  return 'TypeScript';
}

function technologyFor(type: NodeType, file: ParsedSourceFile): string {
  const lang = languagePrefix(file);
  const ext = file.relativePath.split('.').pop()?.toLowerCase() || '';

  switch (type) {
    case 'gateway-api':
      if (ext === 'cs') return 'C# Razor/Blazor Component';
      if (lang === 'TypeScript' || lang === 'JavaScript') return 'React Component';
      return `${lang} UI Component`;
    case 'relational-database':
      if (ext === 'cs') return 'Entity Framework / DB Context';
      if (ext === 'py') return 'SQLAlchemy / DB Client';
      return 'Prisma / SQL Database Client';
    case 'event-broker':
      return `${lang} Event Client`;
    case 'rest-api':
      if (ext === 'cs') return 'ASP.NET Core Controller / Minimal API';
      if (ext === 'py') return 'FastAPI / Flask Router';
      return 'REST Controller / Router';
    case 'cache-store':
      return `${lang} Cache Client`;
    default:
      return `${lang} Domain Service`;
  }
}

function labelFor(type: NodeType, baseName: string): string {
  switch (type) {
    case 'gateway-api':
      return `${baseName} UI Component`;
    case 'relational-database':
      return `${baseName} Database`;
    case 'event-broker':
      return `${baseName} Message Broker`;
    case 'rest-api':
      return `${baseName} REST Endpoint`;
    case 'cache-store':
      return `${baseName} Cache`;
    default:
      return `${baseName} Service`;
  }
}

/**
 * Classify a parsed source file into a NodeType using language-agnostic markers
 * (imports, constructed types, and path/name cues).
 */
export function classifyParsedSource(file: ParsedSourceFile): NodeHydration {
  const pathName = pathAndNameHaystack(file);

  // Import / construction markers (highest confidence when present)
  if (importMatches(file, UI_IMPORT_MARKERS)) {
    return {
      type: 'gateway-api',
      label: labelFor('gateway-api', file.baseName),
      technology: technologyFor('gateway-api', file),
      reason: 'ui-import',
    };
  }

  if (
    importMatches(file, DATABASE_IMPORT_MARKERS) ||
    classMatches(file, DATABASE_CLASS_MARKERS) ||
    matchesAny(pathName, ['DbContext', 'Repository', 'Database', '/db/', '/repository/'])
  ) {
    return {
      type: 'relational-database',
      label: labelFor('relational-database', file.baseName),
      technology: technologyFor('relational-database', file),
      reason: 'database-marker',
    };
  }

  if (
    importMatches(file, EVENT_IMPORT_MARKERS) ||
    (file.newExpressions || []).some(expr => {
      const name = expr.className;
      const lower = name.toLowerCase();
      return (
        (name.includes('Kafka') || name.includes('Queue') || name.includes('Client')) &&
        (lower.includes('queue') || lower.includes('kafka') || lower.includes('redis'))
      );
    }) ||
    matchesAny(pathName, ['Consumer', 'Producer', 'MessageBroker', '/messaging/', '/queue/'])
  ) {
    return {
      type: 'event-broker',
      label: labelFor('event-broker', file.baseName),
      technology: technologyFor('event-broker', file),
      reason: 'event-marker',
    };
  }

  if (
    importMatches(file, API_IMPORT_MARKERS) ||
    matchesAny(pathName, [
      'Controller',
      'Router',
      'MinimalApi',
      '/controllers/',
      '/routes/',
      '/api/',
    ])
  ) {
    return {
      type: 'rest-api',
      label: labelFor('rest-api', file.baseName),
      technology: technologyFor('rest-api', file),
      reason: 'api-marker',
    };
  }

  if (matchesAny(pathName, ['Cache', 'RedisStore', '/cache/'])) {
    return {
      type: 'cache-store',
      label: labelFor('cache-store', file.baseName),
      technology: technologyFor('cache-store', file),
      reason: 'cache-marker',
    };
  }

  return {
    type: 'background-worker',
    label: labelFor('background-worker', file.baseName),
    technology: technologyFor('background-worker', file),
    reason: 'default',
  };
}

/** Apply classification onto an existing SystemNode (mutates + returns it). */
export function hydrateNodeFromSource(node: SystemNode, file: ParsedSourceFile): SystemNode {
  const hydration = classifyParsedSource(file);
  node.type = hydration.type;
  node.name = hydration.label;
  node.properties = {
    ...node.properties,
    technology: hydration.technology,
    classification: hydration.reason,
  };
  return node;
}

/** Infer edge semantics from the hydrated target node type. */
export function dependencyTypeForTarget(target: SystemNode): {
  type: DependencyType;
  description: string;
} {
  switch (target.type) {
    case 'relational-database':
    case 'database':
    case 'cache-store':
      return { type: 'read-write', description: 'Queries datastore records' };
    case 'event-broker':
      return { type: 'publish-subscribe', description: 'Publishes / consumes messaging topics' };
    default:
      return { type: 'direct-call', description: 'Calls module / service' };
  }
}
