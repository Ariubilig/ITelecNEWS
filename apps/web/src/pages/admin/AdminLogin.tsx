import "./AdminLogin.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("И-мэйл болон нууц үг оруулна уу.");
      return;
    }
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (authError) {
      setError("И-мэйл эсвэл нууц үг буруу байна.");
      return;
    }
    navigate("/admin");
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <h1 className="login-title">Админ</h1>
        <input
          className="field login-input"
          type="email"
          placeholder="И-мэйл"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <input
          className="field login-input"
          type="password"
          placeholder="Нууц үг"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        {error && <p className="login-error">{error}</p>}
        <button className="btn btn--primary login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
        </button>
      </div>
    </div>
  );
}
