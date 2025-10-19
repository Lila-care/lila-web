import { Route, Switch } from 'wouter'

import './App.css'
import Home from './Home'
import Terms from './Terms'

const App = () => {

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/terms" component={Terms} />
    </Switch>
  )
}

export default App
