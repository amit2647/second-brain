import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import NoteEditor from "./components/NoteEditor";
import Garden from "./components/Garden";
import Auth from "./components/Auth";
import ExportAllNotes from "./components/ExportAllNotes";
import GraphView from "./components/GraphView";
import UserGarden from "./components/UserGarden";
import { supabase } from "./lib/supabase";
import type { User } from "./types";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved
      ? saved === "true"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email ?? "",
              username: session.user.user_metadata?.username,
            }
          : null,
      );
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email ?? "",
              username: session.user.user_metadata?.username,
            }
          : null,
      );
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <Router>
      <div className="min-h-screen bg-[var(--background)]">
        <Navbar
          user={user}
          setUser={setUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <main className="container py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor/:noteId?" element={<NoteEditor />} />
            <Route path="/garden/:username/:slug" element={<Garden />} />
            <Route path="/auth" element={<Auth setUser={setUser} />} />
            <Route path="/exportnotes" element={<ExportAllNotes />} />
            <Route path="/graph" element={<GraphView />} />
            <Route path="/garden/:username" element={<UserGarden />} />
          </Routes>
        </main>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme={darkMode ? "dark" : "light"}
        />
      </div>
    </Router>
  );
}

export default App;
