import React from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../store/store';
import { slugify } from '../domain/slug';
import { DesignSystemShowcase } from '../components/DesignSystemShowcase';

export const DesignSystemPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { workspaceName, schema } = useBlueprintStore();

  return (
    <DesignSystemShowcase
      onClose={() => {
        const name = workspaceName || schema.name;
        const slug = slugify(name);
        setLocation(`/workspace/${slug}`);
      }}
    />
  );
};
