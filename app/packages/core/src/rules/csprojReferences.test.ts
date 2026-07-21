import { describe, it, expect } from 'vitest';
import {
  parseCsprojProjectReferences,
  csprojBasename,
  resolveCsprojReferencePath,
} from './csprojReferences';

describe('csprojReferences', () => {
  describe('parseCsprojProjectReferences', () => {
    it('extracts ProjectReference Include paths', () => {
      const xml = `
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <ProjectReference Include="..\\Ordering.Domain\\Ordering.Domain.csproj" />
    <ProjectReference Include="..\\Ordering.Infrastructure\\Ordering.Infrastructure.csproj" />
  </ItemGroup>
</Project>`;
      expect(parseCsprojProjectReferences(xml)).toEqual([
        '..\\Ordering.Domain\\Ordering.Domain.csproj',
        '..\\Ordering.Infrastructure\\Ordering.Infrastructure.csproj',
      ]);
    });

    it('ignores PackageReference and other ItemGroup entries', () => {
      const xml = `
<Project>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore" Version="8.0.0" />
    <ProjectReference Include="../Basket.API/Basket.API.csproj" />
  </ItemGroup>
</Project>`;
      expect(parseCsprojProjectReferences(xml)).toEqual(['../Basket.API/Basket.API.csproj']);
    });

    it('returns empty array when no project references exist', () => {
      expect(parseCsprojProjectReferences('<Project Sdk="Microsoft.NET.Sdk" />')).toEqual([]);
    });
  });

  describe('csprojBasename', () => {
    it('strips directory and extension', () => {
      expect(csprojBasename('..\\Ordering.Domain\\Ordering.Domain.csproj')).toBe('Ordering.Domain');
      expect(csprojBasename('Basket.API.csproj')).toBe('Basket.API');
    });
  });

  describe('resolveCsprojReferencePath', () => {
    it('resolves relative paths from a csproj file location', () => {
      expect(
        resolveCsprojReferencePath(
          'src/Ordering.API/Ordering.API.csproj',
          '..\\Ordering.Domain\\Ordering.Domain.csproj'
        )
      ).toBe('src/Ordering.Domain/Ordering.Domain.csproj');
    });
  });
});
