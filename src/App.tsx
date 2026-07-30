import { Route, Switch, Redirect } from "wouter";

import "./App.css";
import Terms from "./Terms";
import Admin from "./Admin";
import Login from "./Admin/Login";
import ChangePassword from "./Admin/ChangePassword";
import AuthCallback from "./Admin/AuthCallback";
import FormsPage from "./Admin/FormsPage";
import PlansPage from "./Admin/PlansPage";
import SubscribersPage from "./Admin/SubscribersPage";
import ChatPage from "./Chat/ChatPage";
import UserLogin from "./UserLogin";
import ProtectedRoute from "./auth/ProtectedRoute";
import { AuthProvider } from "./auth/AuthContext";
import TodayPage from "./Today";
import CalendarPage from "./Calendar";
import LearnPage from "./Learn";
import ProfilePage from "./Profile";
import PrivacyPage from "./Profile/Privacy";

const App = () => {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/">{() => <Redirect to="/today" />}</Route>
        <Route path="/terms" component={Terms} />
        <Route
          path="/admin/dashboard"
          component={() => (
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          )}
        />
        <Route path="/admin/change-password" component={ChangePassword} />
        <Route
          path="/admin/forms"
          component={() => (
            <ProtectedRoute>
              <FormsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/plans"
          component={() => (
            <ProtectedRoute>
              <PlansPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/subscribers"
          component={() => (
            <ProtectedRoute>
              <SubscribersPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/admin" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/today" component={TodayPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/learn" component={LearnPage} />
        <Route path="/profile/privacy" component={PrivacyPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/login" component={UserLogin} />
      </Switch>
    </AuthProvider>
  );
};

export default App;
