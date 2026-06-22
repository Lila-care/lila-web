import { Route, Switch, Redirect } from 'wouter'

import './App.css'
import Terms from './Terms'
import Admin from './Admin'
import Login from './Admin/Login'
import ChangePassword from './Admin/ChangePassword'
import AuthCallback from './Admin/AuthCallback'
import ChatPage from './Chat/ChatPage'
import UserLogin from './UserLogin'
import ProtectedRoute from './auth/ProtectedRoute'
import { AuthProvider } from './auth/AuthContext'

const App = () => {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/">{() => <Redirect to="/chat" />}</Route>
        <Route path="/terms" component={Terms} />
        <Route path="/admin/dashboard" component={() => (
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        )} />
        <Route path="/admin/change-password" component={ChangePassword} />
        <Route path="/admin" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/login" component={UserLogin} />
      </Switch>
    </AuthProvider>
  )
}

export default App
