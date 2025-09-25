import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom"; 
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import DashboardDeafMute from "./pages/DashboardDeafMute";
import DashboardInterpreter from "./pages/DashboardInterpreter";
import ProtectedRoute from "./components/ProtectedRoute";
import { Typography, Button, Box } from "@mui/material";
import { useI18n } from "./context/I18nContext";
import AppLayout from "./components/AppLayout";
import RequireRole from "./components/RequireRole";
import Profile from "./pages/Profile";
import BookSession from "./pages/BookSession";
import Requests from "./pages/Requests";
import Availability from "./pages/Availability";
import MySessions from "./pages/MySessions";
import InterpreterSessions from "./pages/InterpreterSessions";
import CallRoom from "./pages/CallRoom";

function App() {
  const { t } = useI18n();
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>{t("app_title")}</Typography>
            <Button component={Link} to="/signup" variant="contained" sx={{ mr: 2 }}>
              {t("sign_up")}
            </Button>
            <Button component={Link} to="/login" variant="outlined">
              {t("login")}
            </Button>
          </Box>
        } />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* Entry point that decides redirect based on role */}
        <Route path="/dashboard" element={<ProtectedRoute />} />

        {/* Authenticated area with shared layout */}
        <Route element={<AppLayout />}>
          {/* Deaf/Mute area */}
          <Route
            path="/dashboard/deaf-mute"
            element={
              <RequireRole allow="deaf_mute">
                <DashboardDeafMute />
              </RequireRole>
            }
          />
          <Route
            path="/sessions"
            element={
              <RequireRole allow="deaf_mute">
                <MySessions />
              </RequireRole>
            }
          />
          <Route
            path="/book"
            element={
              <RequireRole allow="deaf_mute">
                <BookSession />
              </RequireRole>
            }
          />

          {/* Interpreter area */}
          <Route
            path="/dashboard/interpreter"
            element={
              <RequireRole allow="interpreter">
                <DashboardInterpreter />
              </RequireRole>
            }
          />
          <Route
            path="/interpreter/sessions"
            element={
              <RequireRole allow="interpreter">
                <InterpreterSessions />
              </RequireRole>
            }
          />
          <Route
            path="/requests"
            element={
              <RequireRole allow="interpreter">
                <Requests />
              </RequireRole>
            }
          />
          <Route
            path="/availability"
            element={
              <RequireRole allow="interpreter">
                <Availability />
              </RequireRole>
            }
          />

          {/* Common profile */}
          <Route
            path="/profile"
            element={
              <RequireRole allow={["deaf_mute", "interpreter"]}>
                <Profile />
              </RequireRole>
            }
          />

          {/* Call room for both roles */}
          <Route
            path="/call/:sessionId"
            element={
              <RequireRole allow={["deaf_mute", "interpreter"]}>
                <CallRoom />
              </RequireRole>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
