import { Route, Switch } from 'wouter';
import { WorkspacePage } from './ui/features/workspace';
import { DesignSystemPage } from './ui/features/designSystem';

function App() {
  return (
    <Switch>
      <Route path="/design-system" component={DesignSystemPage} />
      <Route path="/workspace/*" component={WorkspacePage} />
      <Route path="/" component={WorkspacePage} />
      <Route component={WorkspacePage} />
    </Switch>
  );
}

export default App;
