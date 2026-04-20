import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    let department = "Division A";

    const lowerEmail = email.toLowerCase();

    if (lowerEmail.includes("a")) {
      department = "Division A";
    } else if (lowerEmail.includes("b")) {
      department = "Division B";
    } else if (lowerEmail.includes("c")) {
      department = "Division C";
    }

    navigate("/dashboard", { state: { department } });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Smart Seat Allocation</h1>
        <p>Department Head Login</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;