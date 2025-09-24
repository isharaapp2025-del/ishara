import { useEffect, useState } from "react";
import { Box, Button, MenuItem, TextField, Typography, Snackbar, Alert } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useI18n } from "../context/I18nContext";

function Profile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [language, setLanguage] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [open, setOpen] = useState(false);
  const { t, setLocale } = useI18n();

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data() as { full_name?: string; age?: number; phone_number?: string; language?: string };
        setFullName(d.full_name ?? "");
        setAge(d.age?.toString() ?? "");
        setPhoneNumber(d.phone_number ?? "");
        setLanguage(d.language ?? "en");
      }
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        full_name: fullName,
        age: parseInt(age) || 0,
        phone_number: phoneNumber,
        language,
        updated_at: new Date(),
      });
      await setLocale((language as "en" | "ar"));
      setMessage("Profile updated successfully!");
      setOpen(true);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setMessage("Failed to update profile. Please try again.");
      setOpen(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h5" gutterBottom>{t("my_profile")}</Typography>
      <TextField label="Full Name" fullWidth margin="normal" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <TextField label="Age" type="number" fullWidth margin="normal" value={age} onChange={(e) => setAge(e.target.value)} />
      <TextField label="Phone Number" fullWidth margin="normal" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
      <TextField select label={t("language")} fullWidth margin="normal" value={language} onChange={(e) => setLanguage(e.target.value)}>
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="ar">العربية</MenuItem>
      </TextField>
      <Button variant="contained" sx={{ mt: 2 }} onClick={save} disabled={saving}>
        {saving ? "Saving..." : t("save")}
      </Button>
      
      <Snackbar 
        open={open} 
        autoHideDuration={4000} 
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

export default Profile;


