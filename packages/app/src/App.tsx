import { Route, Switch } from 'wouter';
import { WorkspacePage } from './ui/features/workspace';
import { DesignSystemPage } from './ui/features/designSystem';
import { SystemOverviewPage } from './ui/features/systemOverview';
import { useBlueprintStore } from './application/store/store';

function App() {
  const manifestOverviewEnabled = useBlueprintStore(
    state => state.workspaceManifest?.overview?.enabled === true
  );
  const containerSystemCount = useBlueprintStore(
    state => state.loadedSystems.filter(s => s.schema.level === 'container').length
  );

  // Show the overview when: manifest explicitly enables it, OR ≥2 container
  // systems are loaded (useful in dev without a full workspace manifest).
  const overviewEnabled = manifestOverviewEnabled || containerSystemCount >= 2;
  const hasAnyContainers = containerSystemCount >= 1;

  return (
    <Switch>
      <Route path="/design-system" component={DesignSystemPage} />
      {/* /overview — always navigable when there is at least one container system */}
      {hasAnyContainers && <Route path="/overview" component={SystemOverviewPage} />}
      {/* /workspace/<slug> — a specific diagram */}
      <Route path="/workspace/*" component={WorkspacePage} />
      {/* /workspace (no slug) or / — show overview when enabled, else workspace */}
      <Route path="/workspace">
        {overviewEnabled ? <SystemOverviewPage /> : <WorkspacePage />}
      </Route>
      <Route path="/">{overviewEnabled ? <SystemOverviewPage /> : <WorkspacePage />}</Route>
      <Route component={WorkspacePage} />
    </Switch>
  );
}

export default App;
