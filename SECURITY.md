# Security Policy

## Reporting a vulnerability

If you believe you have found a security issue in Blueprint, please report it privately rather than opening a public issue.

**Preferred:** use [GitHub Security Advisories](https://github.com/mzworthington/blueprint/security/advisories/new) to submit a confidential report.

Please include:

- A clear description of the issue and its impact
- Steps to reproduce, or a minimal proof of concept
- Affected component (Designer, CLI, or `@blueprint/core`)
- Blueprint version or commit, if known

We will acknowledge your report as soon as we can and keep you updated on progress. Please do not disclose the issue publicly until we have had a chance to address it.

## Supported versions

Security fixes are applied to the latest release and `main`. Older versions may not receive patches.

## Scope

Blueprint is a local-first tool. Reports we are especially interested in include:

- Remote code execution or arbitrary file access via the CLI or import parsers
- Cross-site scripting or other issues in the Designer web app
- Ways to bypass schema validation or corrupt workspace data unexpectedly

General feature requests and non-security bugs should use the [issue templates](.github/ISSUE_TEMPLATE/).

## Additional reading

- [Architecture & security](docs/architecture.md)
