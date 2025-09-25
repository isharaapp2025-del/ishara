import { AppBar, Toolbar, Typography, Button, Box, MenuItem, Select } from "@mui/material";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { useI18n } from "../context/I18nContext";

function AppLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setRole((snap.data() as { role?: string }).role ?? null);
    };
    load();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <Box>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t("app_title")}
          </Typography>
          {role === "deaf_mute" && (
            <>
              <Button component={Link} to="/dashboard/deaf-mute">{t("dashboard")}</Button>
              <Button component={Link} to="/book">{t("book_session")}</Button>
              <Button component={Link} to="/sessions">{t("my_sessions")}</Button>
            </>
          )}
          {role === "interpreter" && (
            <>
              <Button component={Link} to="/dashboard/interpreter">{t("dashboard")}</Button>
              <Button component={Link} to="/requests">{t("requests")}</Button>
              <Button component={Link} to="/availability">{t("availability")}</Button>
              <Button component={Link} to="/interpreter/sessions">{t("my_sessions")}</Button>
            </>
          )}
              <Button component={Link} to="/profile">{t("profile")}</Button>
          <Select size="small" value={locale} onChange={(e) => setLocale(e.target.value as "en" | "ar")} sx={{ mx: 1 }}>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="ar">العربية</MenuItem>
          </Select>
          <Button onClick={handleLogout} color="error">{t("logout")}</Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default AppLayout;


