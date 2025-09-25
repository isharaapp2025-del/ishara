import { Box, Button, Stack, Typography, Snackbar, Alert } from "@mui/material";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { collection, doc, onSnapshot, query, updateDoc, where, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import { createPeerJSCall } from "../services/callService";

interface SItem {
  id: string;
  scheduled_time: string;
  status: "requested" | "confirmed" | "cancelled" | "completed";
  user_id: string;
}

function Requests() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<SItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "sessions"), where("interpreter_id", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        data.sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
        setItems(data);
      },
      (err) => {
        console.error("Requests listener error", err);
      }
    );
    return () => unsub();
  }, [user]);

  const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setSavingId(id);
    try {
      // Update session status
      await updateDoc(doc(db, "sessions", id), { status });
      
      // If confirming, create PeerJS call
      if (status === "confirmed") {
        try {
          // Generate a simple peer ID for the caller (user)
          const callerPeerId = `peer_${user!.uid}_${Date.now()}`;
          await createPeerJSCall(id, user!.uid, callerPeerId);
          console.log('PeerJS call created for session:', id);
        } catch (callError) {
          console.error('Failed to create PeerJS call:', callError);
          // Don't fail the whole operation if call creation fails
        }
      }
      
      const action = status === "confirmed" ? "accepted" : "rejected";
      setMessage(`Session ${action} successfully!`);
      setOpen(true);
    } catch (e) {
      console.error(`Failed to update session status to ${status}:`, e);
      setMessage(`Failed to ${status === "confirmed" ? "accept" : "reject"} session. Please try again.`);
      setOpen(true);
    } finally {
      setSavingId(null);
    }
  };
  return (
    <Box>
      <Typography variant="h5" gutterBottom>{t("requests_title")}</Typography>
      <Stack spacing={1}>
        {items.map((s) => (
          <Stack key={s.id} direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ border: "1px solid #ddd", p: 1, borderRadius: 1 }}>
            <Typography sx={{ minWidth: 240 }}>{new Date(s.scheduled_time).toLocaleString()}</Typography>
            <Typography sx={{ minWidth: 120 }}>{s.status}</Typography>
            <Box sx={{ flexGrow: 1 }} />
            {s.status === "requested" && (
              <>
                <Button variant="contained" onClick={() => updateStatus(s.id, "confirmed")} disabled={savingId === s.id}>{t("accept")}</Button>
                <Button color="error" onClick={() => updateStatus(s.id, "cancelled")} disabled={savingId === s.id}>{t("reject")}</Button>
              </>
            )}
          </Stack>
        ))}
      </Stack>
      
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

export default Requests;


