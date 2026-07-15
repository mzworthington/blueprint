import { useEffect } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { WorkspacePage } from './ui/features/workspace';
import { DesignSystemPage } from './ui/features/designSystem';
import { DocsHome, DocsPage } from './ui/features/docs';

/** Vite BASE_URL always has a trailing slash; wouter wants none. */
const routerBase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to, { replace: true });
  }, [setLocation, to]);
  return null;
}

function App() {
  return (
    <Router base={routerBase}>
      <Switch>
        <Route path="/design-system" component={DesignSystemPage} />
        <Route path="/workspace" component={WorkspacePage} />
        <Route path="/workspace/*" component={WorkspacePage} />
        {/* Legacy GitHub Pages layout: /app → workspace */}
        <Route path="/app">{() => <Redirect to="/workspace" />}</Route>
        <Route path="/app/*">{() => <Redirect to="/workspace" />}</Route>
        <Route path="/guide" component={DocsPage} />
        <Route path="/guide/:page" component={DocsPage} />
        <Route path="/setup" component={DocsPage} />
        <Route path="/architecture" component={DocsPage} />
        <Route path="/journeys" component={DocsPage} />
        <Route path="/" component={DocsHome} />
        <Route component={DocsPage} />
      </Switch>
    </Router>
  );
}

export default App;
