import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "../types";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

interface AuthProps {
  setUser: (user: User | null) => void;
}

function Auth({ setUser }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (!username) {
      toast.error("Please enter a username.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      toast.error("Username must be alphanumeric with underscores or hyphens.");
      return;
    }

    setIsLoading(true);
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      toast.error("Username is already taken.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from("users").insert([{ id: data.user.id, username }]);
      setUser({ id: data.user.id, email: data.user.email ?? "", username });
      toast.success("Check your email for confirmation!");
    }
    setIsLoading(false);
  };

  const handleLogin = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }
    if (data.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", data.user.id)
        .single();
      setUser({
        id: data.user.id,
        email: data.user.email ?? "",
        username: profile?.username || data.user.user_metadata?.username,
      });
      toast.success("Logged in successfully!");
      navigate("/");
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold text-[var(--text)] text-center">
        Authentication
      </h1>
      <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            disabled={isLoading}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
            disabled={isLoading}
          />
        </div>
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input mt-1"
            disabled={isLoading}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSignUp}
            className="btn btn-primary flex-1"
            disabled={isLoading}
          >
            {isLoading ? "Signing Up..." : "Sign Up"}
          </button>
          <button
            onClick={handleLogin}
            className="btn btn-accent flex-1"
            disabled={isLoading}
          >
            {isLoading ? "Logging In..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;
