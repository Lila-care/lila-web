import { Route, Switch } from 'wouter'

import './App.css'
import Home from './Home'
import Terms from './Terms'
import Admin from './Admin'

const App = () => {

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/terms" component={Terms} />
      <Route path="/admin" component={Admin} />
    </Switch>
  )
}

export default App
