import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";

function Dashboard() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [topLinkedNotes, setTopLinkedNotes] = useState<
    { note: Note; backlinks: number }[]
  >([]);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        console.error("No user ID found");
        return;
      }

      // Fetch username
      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

      const username = profile?.username;
      setUsername(username);

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) console.error("Failed to load recent notes:", error);
      else setRecentNotes(data as Note[]);

      const { data: allLinks, error: linkErr } = await supabase
        .from("links")
        .select("target_note_id");

      if (linkErr || !allLinks) {
        console.error("Failed to fetch links:", linkErr);
        return;
      }

      const backlinkCounts: Record<string, number> = {};
      for (const link of allLinks) {
        if (!link.target_note_id) continue;
        backlinkCounts[link.target_note_id] =
          (backlinkCounts[link.target_note_id] || 0) + 1;
      }

      const sortedNoteIds = Object.entries(backlinkCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([noteId]) => noteId);

      if (sortedNoteIds.length === 0) return;

      const { data: topNotes } = await supabase
        .from("notes")
        .select("*")
        .in("id", sortedNoteIds);

      const ranked = topNotes?.map((note) => ({
        note,
        backlinks: backlinkCounts[note.id] || 0,
      }));

      setTopLinkedNotes(ranked || []);
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchSearch = async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .textSearch("content", search, {
          type: "websearch",
        });

      if (error) {
        console.error("Search error:", error);
        return;
      }

      setSearchResults(data as Note[]);
    };

    fetchSearch();
  }, [search]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📚 Second Brain Dashboard</h1>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search notes by content or title"
          className="w-full p-2 border rounded"
        />
        {searchResults.length > 0 && (
          <ul className="mt-2 bg-white border rounded p-2 max-h-64 overflow-y-auto">
            {searchResults.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/editor/${note.id}`}
                  className="text-blue-500 hover:underline"
                >
                  {note.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">🕒 Recent Notes</h2>
          <ul className="space-y-1">
            {recentNotes.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/editor/${note.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {note.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">🔗 Most Linked Notes</h2>
          <ul className="space-y-1">
            {topLinkedNotes.map(({ note, backlinks }) => (
              <li key={note.id}>
                <Link
                  to={`/editor/${note.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {note.title}
                </Link>{" "}
                <span className="text-gray-500">({backlinks} backlinks)</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex gap-4 flex-wrap">
        <Link
          to="/editor"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          ➕ New Note
        </Link>
        <Link
          to="/graph"
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
        >
          🧠 View Graph
        </Link>
        <Link
          to="/exportnotes"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          ⬇️ Export Notes
        </Link>
        {username && (
          <Link
            to={`/garden/${username}`}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            🌱 View Garden
          </Link>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
