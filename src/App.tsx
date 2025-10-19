import { Route, Switch } from 'wouter'

import './App.css'
import Terms from './Terms'
import Home from './Home'

const App = () => {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/terms" component={Terms} />
    </Switch>
  )
}

export default App
