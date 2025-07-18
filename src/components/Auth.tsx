import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

interface AuthProps {
  setUser: (user: User | null) => void;
}

function Auth({ setUser }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    console.log("Signing up with email:", email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else {
      alert("Check your email for confirmation!");
      if (data.user)
        setUser({ id: data.user.id, email: data.user.email ?? "" });
    }
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else if (data.user)
      setUser({ id: data.user.id, email: data.user.email ?? "" });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 rounded"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSignUp}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Sign Up
        </button>
        <button
          onClick={handleLogin}
          className="bg-green-500 text-white p-2 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Auth;
