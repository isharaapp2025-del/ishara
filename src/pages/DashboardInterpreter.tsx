import { Typography, Box } from "@mui/material";
import { useI18n } from "../context/I18nContext";

function DashboardInterpreter() {
  const { t } = useI18n();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">{t("interpreter_dashboard_title")}</Typography>
      <Typography>{t("interpreter_dashboard_desc")}</Typography>
    </Box>
  );
}

export default DashboardInterpreter;
