import { describe, it, expect } from 'vitest';
import { mapProviderTypeToNodeType } from './iacResourceMap';

describe('mapProviderTypeToNodeType', () => {
  it.each([
    ['aws_rds_instance', 'relational-database'],
    ['azurerm_mssql_database', 'relational-database'],
    ['google_sql_database_instance', 'relational-database'],
    ['aws_dynamodb_table', 'database'],
    ['aws_elasticache_cluster', 'cache-store'],
    ['azurerm_redis_cache', 'cache-store'],
    ['aws_msk_cluster', 'event-broker'],
    ['aws_sns_topic', 'event-broker'],
    ['aws_sqs_queue', 'event-broker'],
    ['aws_lambda_function', 'serverless-function'],
    ['google_cloudfunctions_function', 'serverless-function'],
    ['azurerm_function_app', 'serverless-function'],
    ['aws_ecs_service', 'microservice'],
    ['azurerm_container_app', 'microservice'],
    ['aws_lb', 'gateway-api'],
    ['aws_api_gateway_rest_api', 'gateway-api'],
    ['aws_cloudfront_distribution', 'gateway-api'],
  ] as const)('maps %s → %s', (providerType, expected) => {
    const result = mapProviderTypeToNodeType(providerType);
    expect(result.nodeType).toBe(expected);
    expect(result.known).toBe(true);
  });

  it('defaults unknown types to container and marks unknown', () => {
    const result = mapProviderTypeToNodeType('aws_s3_bucket');
    expect(result.nodeType).toBe('container');
    expect(result.known).toBe(false);
  });
});
