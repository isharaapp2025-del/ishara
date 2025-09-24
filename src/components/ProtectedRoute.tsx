import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { CircularProgress, Box } from "@mui/material";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        console.log("🔎 Fetching Firestore doc for user:", user.uid);
        const docRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const userData = snapshot.data();
          console.log("✅ Firestore user doc:", userData);
          setRole(userData.role);
        } else {
          console.log("⚠️ No Firestore doc found for this user!");
        }
      }
      setChecking(false);
    };
    fetchRole();
  }, [user]);

  if (loading || checking) {
    console.log("⏳ Waiting... loading:", loading, "checking:", checking);
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    console.log("🚪 No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("🎯 Final role check:", role);

  if (role === "deaf_mute") return <Navigate to="/dashboard/deaf-mute" replace />;
  if (role === "interpreter") return <Navigate to="/dashboard/interpreter" replace />;

  return <p>⚠️ No role found in Firestore. Check user doc.</p>;
}

export default ProtectedRoute;
