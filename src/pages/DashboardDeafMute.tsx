import { Typography, Box } from "@mui/material";
import { useI18n } from "../context/I18nContext";

function DashboardDeafMute() {
  const { t } = useI18n();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">{t("deaf_dashboard_title")}</Typography>
      <Typography>{t("deaf_dashboard_desc")}</Typography>
    </Box>
  );
}

export default DashboardDeafMute;
