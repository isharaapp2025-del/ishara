import { useState } from "react";
import { TextField, Button, Typography, Box, Alert } from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"deaf_mute" | "interpreter">("deaf_mute");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const handleSignup = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user doc in Firestore
      const now = new Date();
      await setDoc(doc(db, "users", user.uid), {
        user_id: user.uid,
        email: user.email,
        password_hash: "", // Firebase handles this
        role: role,
        full_name: fullName,
        age: parseInt(age) || 0,
        language: locale,
        phone_number: phoneNumber,
        created_at: now,
        updated_at: now,
      });

      // Create interpreter profile if role is interpreter
      if (role === "interpreter") {
        await setDoc(doc(db, "interpreters", user.uid), {
          interpreter_id: user.uid,
          availability: {},
          average_rating: 0,
          total_sessions: 0,
          bio: "",
        });
      }

      console.log("✅ User Firestore doc created with role:", role);

      // Redirect to ProtectedRoute
      navigate("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Signup error:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Try logging in instead, or use a different email.");
      } else if (error.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters long.");
      } else if (error.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else {
        setError(error.message || "Signup failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 400, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        {t("sign_up")}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Full Name"
        fullWidth
        margin="normal"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={isLoading}
      />

      <TextField
        label={t("email")}
        fullWidth
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />

      <TextField
        label={t("password")}
        type="password"
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />

      <TextField
        label="Age"
        type="number"
        fullWidth
        margin="normal"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        disabled={isLoading}
      />

      <TextField
        label="Phone Number"
        fullWidth
        margin="normal"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        disabled={isLoading}
      />

      {/* Role selection */}
      <Box sx={{ mt: 2 }}>
        <Button
          variant={role === "deaf_mute" ? "contained" : "outlined"}
          onClick={() => setRole("deaf_mute")}
          sx={{ mr: 1 }}
          disabled={isLoading}
        >
          {t("role_deaf_mute")}
        </Button>
        <Button
          variant={role === "interpreter" ? "contained" : "outlined"}
          onClick={() => setRole("interpreter")}
          disabled={isLoading}
        >
          {t("role_interpreter")}
        </Button>
      </Box>

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 3 }}
        onClick={handleSignup}
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : t("create_account")}
      </Button>
    </Box>
  );
}

export default Signup;
