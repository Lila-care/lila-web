import { Route, Switch, Redirect } from "wouter";

import "./App.css";
import Terms from "./Terms";
import DashboardPage from "./Admin/DashboardPage";
import UsersPage from "./Admin/UsersPage";
import ReportsPage from "./Admin/ReportsPage";
import Login from "./Admin/Login";
import ChangePassword from "./Admin/ChangePassword";
import AuthCallback from "./Admin/AuthCallback";
import FormsPage from "./Admin/FormsPage";
import ChatPage from "./Chat/ChatPage";
import UserLogin from "./UserLogin";
import ProtectedRoute from "./auth/ProtectedRoute";
import { AuthProvider } from "./auth/AuthContext";
import HoyPage from "./Hoy";
import CalendarioPage from "./Calendario";
import AprendePage from "./Aprende";
import PerfilPage from "./Perfil";
import PrivacidadPage from "./Perfil/Privacidad";

const App = () => {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/">{() => <Redirect to="/hoy" />}</Route>
        <Route path="/terms" component={Terms} />
        <Route
          path="/admin/dashboard"
          component={() => (
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/admin/change-password" component={ChangePassword} />
        <Route
          path="/admin/users"
          component={() => (
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/reports"
          component={() => (
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/forms"
          component={() => (
            <ProtectedRoute>
              <FormsPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/admin" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/hoy" component={HoyPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/calendario" component={CalendarioPage} />
        <Route path="/aprende" component={AprendePage} />
        <Route path="/perfil/privacidad" component={PrivacidadPage} />
        <Route path="/perfil" component={PerfilPage} />
        <Route path="/login" component={UserLogin} />
      </Switch>
    </AuthProvider>
  );
};

export default App;
