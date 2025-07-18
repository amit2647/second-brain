import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import type { User } from "./types";
import Auth from "./components/Auth";
import NoteEditor from "./components/NoteEditor";
import { supabase } from "./lib/supabase";
import Garden from "./components/Garden";
import GraphView from "./components/GraphView";
import ExportAllNotes from "./components/ExportAllNotes";
import Dashboard from "./components/Dashboard";
import UserGarden from "./components/UserGarden";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? "" });
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="container mx-auto p-4">
        <Routes>
          {/* Public Routes */}
          <Route path="/garden/:username" element={<UserGarden />} />
          <Route path="/garden/:username/:slug" element={<Garden />} />

          {user ? (
            <>
              {/* Protected Routes */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<NoteEditor />} />
              <Route path="/editor/:noteId" element={<NoteEditor />} />
              <Route path="/graph" element={<GraphView />} />
              <Route path="/exportnotes" element={<ExportAllNotes />} />
            </>
          ) : (
            <>
              {/* Redirect all other paths to Auth if not logged in */}
              <Route path="*" element={<Auth setUser={setUser} />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
