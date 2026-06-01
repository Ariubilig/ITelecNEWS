import "./AdminLogin.css";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return setError("И-мэйл болон нууц үг оруулна уу.");
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) return setError("И-мэйл эсвэл нууц үг буруу байна.");
    navigate("/admin");
  };

  return (
    <div className="login-root">
      <div className="login-card">
        <h1 className="login-title">Админ</h1>
        <input
          className="login-input"
          type="email"
          placeholder="И-мэйл"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <input
          className="login-input"
          type="password"
          placeholder="Нууц үг"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        {error && <p className="login-error">{error}</p>}
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
        </button>
      </div>
    </div>
  );
}
