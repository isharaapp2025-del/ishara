import { Box, Button, Radio, RadioGroup, FormControlLabel, Stack, TextField, Typography, Snackbar, Alert } from "@mui/material";
import { useI18n } from "../context/I18nContext";
import { useState } from "react";
import { collection, doc, getDocs, addDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function BookSession() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [mode, setMode] = useState<"immediate" | "scheduled">("immediate");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [matchingInterpreters, setMatchingInterpreters] = useState<Array<{ id: string; full_name?: string }>>([]);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [open, setOpen] = useState(false);

  // Removed unused useEffect for loading interpreters

  // Helper to check if a given ISO date/time fits the interpreter's weekly config
  const isAvailableAt = (cfg: { isAlwaysAvailable: boolean; days: Record<string, { morning: boolean; evening: boolean }> }, at: Date) => {
    if (cfg.isAlwaysAvailable) return true;
    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;
    const dayKey = dayNames[at.getDay()];
    const hour = at.getHours();
    const dayCfg = (cfg.days as any)[dayKey] as { morning: boolean; evening: boolean } | undefined;
    if (!dayCfg) return false;
    const inMorning = hour >= 6 && hour < 14;
    const inEvening = hour >= 14 && hour < 22;
    return (dayCfg.morning && inMorning) || (dayCfg.evening && inEvening);
  };

  const findMatching = async () => {
    const now = new Date();
    const target = mode === "immediate" ? now : (date && time ? new Date(`${date}T${time}:00`) : null);
    if (!target) return;
    if (target < now) {
      alert("Please choose a future date/time");
      return;
    }
    const qSnap = await getDocs(collection(db, "users"));
    const interpretersList = qSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((u) => u.role === "interpreter");
    const result: Array<{ id: string; full_name?: string }> = [];
    for (const i of interpretersList) {
      const cfgSnap = await getDoc(doc(db, "interpreters", i.id));
      if (!cfgSnap.exists()) continue;
      const cfg = cfgSnap.data() as { availability?: { isAlwaysAvailable: boolean; days: Record<string, { morning: boolean; evening: boolean }> } };
      if (!cfg.availability) continue;
      if (isAvailableAt(cfg.availability, target)) result.push({ id: i.id, full_name: i.full_name });
    }
    setMatchingInterpreters(result);
  };

  const requestSession = async (interpreterId: string) => {
    if (!user) return;
    setBooking(true);
    try {
      const now = new Date();
      const scheduled = mode === "immediate" ? now : (date && time ? new Date(`${date}T${time}:00`) : now);
      if (scheduled < now) {
        setMessage("Please choose a future date/time");
        setOpen(true);
        return;
      }
      const scheduledTime = scheduled.toISOString();
      await addDoc(collection(db, "sessions"), {
        session_id: "", // Will be auto-generated
        user_id: user.uid,
        interpreter_id: interpreterId,
        scheduled_time: scheduledTime,
        status: "requested",
        duration: 0,
        created_at: new Date(),
      });
      setMessage("Session reserved successfully! Check 'My Sessions' for updates.");
      setOpen(true);
    } catch (e) {
      console.error("Failed to create session", e);
      setMessage("Failed to reserve session. Please try again.");
      setOpen(true);
    } finally {
      setBooking(false);
    }
  };
  return (
    <Box>
      <Typography variant="h5" gutterBottom>{t("book_title")}</Typography>
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        <div>
          <Typography sx={{ mb: 1 }}>{t("booking_mode")}</Typography>
          <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <FormControlLabel value="immediate" control={<Radio />} label={t("immediate")} />
            <FormControlLabel value="scheduled" control={<Radio />} label={t("scheduled")} />
          </RadioGroup>
        </div>
        {mode === "scheduled" && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              type="date"
              label={t("select_date")}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              inputProps={{ min: new Date().toISOString().split("T")[0] }}
              fullWidth
            />
            <TextField
              type="time"
              label={t("select_time")}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              fullWidth
            />
          </Stack>
        )}
        <Button variant="outlined" onClick={findMatching}>{t("find_interpreters")}</Button>
        <div>
          <Typography sx={{ mb: 1 }}>{t("available_interpreters")}</Typography>
          <Stack spacing={1}>
            {matchingInterpreters.map((i) => (
              <Stack key={i.id} direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ border: "1px solid #ddd", p: 1, borderRadius: 1 }}>
                <Typography sx={{ flex: 1 }}>{i.full_name || i.id}</Typography>
                <Button 
                  variant="contained" 
                  onClick={() => requestSession(i.id)}
                  disabled={booking}
                >
                  {booking ? "Reserving..." : t("reserve")}
                </Button>
              </Stack>
            ))}
          </Stack>
        </div>
      </Stack>
      
      <Snackbar 
        open={open} 
        autoHideDuration={5000} 
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={message.includes("successfully") ? "success" : "error"} 
          onClose={() => setOpen(false)}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default BookSession;


