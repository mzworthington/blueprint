import type { NodeType } from '../models/schema';

export interface ResourceTypeMapping {
  nodeType: NodeType;
  known: boolean;
}

const EXACT: Record<string, NodeType> = {
  aws_rds_instance: 'relational-database',
  azurerm_mssql_database: 'relational-database',
  google_sql_database_instance: 'relational-database',
  aws_dynamodb_table: 'database',
  aws_elasticache_cluster: 'cache-store',
  azurerm_redis_cache: 'cache-store',
  aws_msk_cluster: 'event-broker',
  aws_sns_topic: 'event-broker',
  aws_sqs_queue: 'event-broker',
  aws_lambda_function: 'serverless-function',
  google_cloudfunctions_function: 'serverless-function',
  azurerm_function_app: 'serverless-function',
  aws_ecs_service: 'microservice',
  azurerm_container_app: 'microservice',
  aws_lb: 'gateway-api',
  aws_api_gateway_rest_api: 'gateway-api',
  aws_cloudfront_distribution: 'gateway-api',
};

const HEURISTICS: Array<{ test: (t: string) => boolean; nodeType: NodeType }> = [
  {
    test: t => /_rds_instance$|_db_instance$|_sql_database/.test(t) || t.includes('mssql'),
    nodeType: 'relational-database',
  },
  {
    test: t =>
      t.includes('dynamodb') ||
      t.includes('cosmosdb') ||
      t.includes('firestore') ||
      /_mongo/.test(t),
    nodeType: 'database',
  },
  {
    test: t => t.includes('elasticache') || t.includes('redis_cache') || t.includes('memorystore'),
    nodeType: 'cache-store',
  },
  {
    test: t =>
      t.includes('_msk_') ||
      t.includes('_kafka_') ||
      t.includes('pubsub') ||
      t.includes('sns_topic') ||
      t.includes('sqs_queue') ||
      t.includes('servicebus') ||
      t.includes('eventhub'),
    nodeType: 'event-broker',
  },
  {
    test: t =>
      t.includes('lambda_function') || t.includes('cloudfunctions') || t.includes('function_app'),
    nodeType: 'serverless-function',
  },
  {
    test: t =>
      t.includes('ecs_service') ||
      t.includes('_eks_') ||
      t.includes('container_app') ||
      t.includes('app_service'),
    nodeType: 'microservice',
  },
  {
    test: t =>
      /_lb$|_alb$/.test(t) ||
      t.includes('api_gateway') ||
      t.includes('apigateway') ||
      t.includes('cloudfront') ||
      t.includes('application_gateway'),
    nodeType: 'gateway-api',
  },
];

export function mapProviderTypeToNodeType(providerType: string): ResourceTypeMapping {
  const exact = EXACT[providerType];
  if (exact) return { nodeType: exact, known: true };

  for (const rule of HEURISTICS) {
    if (rule.test(providerType)) return { nodeType: rule.nodeType, known: true };
  }

  return { nodeType: 'container', known: false };
}
