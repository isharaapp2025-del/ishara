import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useI18n } from "./context/I18nContext";

function ThemedApp() {
  const { direction, locale } = useI18n();
  const theme = createTheme({
    direction,
    typography: {
      fontFamily: direction === "rtl" ? "Noto Naskh Arabic, system-ui, Arial" : "Inter, system-ui, Arial",
    },
  });
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <I18nProvider>
        <ThemedApp />
      </I18nProvider>
    </AuthProvider>
  </React.StrictMode>
);
