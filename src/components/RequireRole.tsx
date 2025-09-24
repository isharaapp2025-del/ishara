import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress, Typography } from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

type Role = "deaf_mute" | "interpreter";

function RequireRole({ allow, children }: { allow: Role | Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || null);
          } else {
            console.warn("No user document found for:", user.uid);
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setCheckingRole(false);
    };

    fetchUserRole();
  }, [user]);

  // Show loading spinner while checking auth or role
  if (loading || checkingRole) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is allowed
  const allowedRoles = Array.isArray(allow) ? allow : [allow];
  const isAuthorized = userRole && allowedRoles.includes(userRole as Role);

  if (!isAuthorized) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Typography variant="h5" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1">
          You don't have permission to access this page.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Required role: {Array.isArray(allow) ? allow.join(" or ") : allow}
        </Typography>
        <Typography variant="body2">
          Your role: {userRole || "Not found"}
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}

export default RequireRole;
