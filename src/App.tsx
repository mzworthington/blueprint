import { Route, Switch } from 'wouter';
import { WorkspacePage } from './pages/WorkspacePage';
import { DesignSystemPage } from './pages/DesignSystemPage';

function App() {
  return (
    <Switch>
      <Route path="/design-system" component={DesignSystemPage} />
      <Route path="/workspace/:slug" component={WorkspacePage} />
      <Route path="/" component={WorkspacePage} />
      <Route component={WorkspacePage} />
    </Switch>
  );
}

export default App;
