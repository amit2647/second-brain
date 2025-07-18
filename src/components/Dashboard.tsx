import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { debounce } from "lodash";

function Dashboard() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [topLinkedNotes, setTopLinkedNotes] = useState<
    { note: Note; backlinks: number }[]
  >([]);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        toast.error("Please log in to view your dashboard.");
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

      setUsername(profile?.username || null);

      const { data: recent, error: recentError } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) {
        toast.error("Failed to load recent notes.");
      } else {
        setRecentNotes(recent as Note[]);
      }

      const { data: allLinks, error: linkErr } = await supabase
        .from("links")
        .select("target_note_id");

      if (linkErr || !allLinks) {
        toast.error("Failed to fetch links.");
        setIsLoading(false);
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

      if (sortedNoteIds.length === 0) {
        setIsLoading(false);
        return;
      }

      const { data: topNotes } = await supabase
        .from("notes")
        .select("*")
        .in("id", sortedNoteIds);

      setTopLinkedNotes(
        topNotes?.map((note) => ({
          note,
          backlinks: backlinkCounts[note.id] || 0,
        })) || [],
      );
      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Memoized debounced search
  const debouncedSearch = useMemo(() => {
    return debounce(async (value: string) => {
      if (!value.trim()) {
        setSearchResults([]);
        return;
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .textSearch("content", value, { type: "websearch" });

      if (error) {
        toast.error("Search failed.");
        return;
      }

      setSearchResults(data as Note[]);
    }, 300);
  }, []);

  // Use effect for debounced search and cleanup
  useEffect(() => {
    debouncedSearch(search);
    return () => {
      debouncedSearch.cancel();
    };
  }, [search, debouncedSearch]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--text)]">Dashboard</h1>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="input pr-10"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)]"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        {searchResults.length > 0 && (
          <ul
            className="mt-2 border border-[var(--border)] rounded-lg shadow-lg max-h-64 overflow-y-auto"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--text)",
            }}
          >
            {searchResults.map((note) => (
              <li key={note.id} className="p-3 hover:bg-[var(--hover-bg)]">
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

      {/* Loading Spinner */}
      {isLoading ? (
        <div className="flex justify-center">
          <FontAwesomeIcon icon={faSpinner} spin />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Notes */}
          <div
            className="p-6 rounded-lg shadow-md"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--text)",
            }}
          >
            <h2 className="text-xl font-semibold mb-4 text-[var(--text)]">
              Recent Notes
            </h2>
            {recentNotes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No recent notes found.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentNotes.map((note) => (
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

          {/* Top Linked Notes */}
          <div
            className="p-6 rounded-lg shadow-md"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--text)",
            }}
          >
            <h2 className="text-xl font-semibold mb-4 text-[var(--text)]">
              Most Linked Notes
            </h2>
            {topLinkedNotes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No linked notes found.
              </p>
            ) : (
              <ul className="space-y-2">
                {topLinkedNotes.map(({ note, backlinks }) => (
                  <li
                    key={note.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2"
                  >
                    <Link
                      to={`/editor/${note.id}`}
                      className="text-blue-500 hover:underline"
                    >
                      {note.title}
                    </Link>
                    <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-right">
                      ({backlinks} backlinks)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Link to="/editor" className="btn btn-primary">
          New Note
        </Link>
        <Link to="/graph" className="btn btn-secondary">
          View Graph
        </Link>
        <Link to="/exportnotes" className="btn btn-accent">
          Export Notes
        </Link>
        {username && (
          <Link
            to={`/garden/${username}`}
            className="btn btn-accent bg-yellow-500 hover:bg-yellow-600"
          >
            View Garden
          </Link>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
