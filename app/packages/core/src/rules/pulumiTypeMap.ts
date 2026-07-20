/** Map a Pulumi type token (e.g. `aws:lambda:Function`) to a Terraform-style provider type. */
export function pulumiTypeToProviderType(pulumiType: string): string {
  const parts = pulumiType.split(':');
  if (parts.length >= 3) {
    const [provider, module, ...rest] = parts;
    const typeName = rest.join(':');
    return `${provider}_${module}_${typeName}`.replace(/\//g, '_').toLowerCase();
  }
  return pulumiType.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
}

/** Map a TS qualified name (e.g. `aws.lambda.Function`) to a Pulumi type token. */
export function tsQualifiedNameToPulumiType(qualified: string): string {
  const parts = qualified.split('.');
  if (parts.length >= 3) {
    const [provider, module, ...rest] = parts;
    const className = rest.join('.');
    return `${provider}:${module}:${className}`;
  }
  return qualified;
}
