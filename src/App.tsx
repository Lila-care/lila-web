import { Route, Switch } from 'wouter'

import './App.css'
import Home from './Home'
import Terms from './Terms'
import Admin from './Admin'
import Login from './Admin/Login'

const App = () => {

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/terms" component={Terms} />
      <Route path="/admin/dashboard" component={Admin} />
      <Route path="/admin" component={Login} />
    </Switch>
  )
}

export default App
