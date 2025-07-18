import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";

function UserGarden() {
  const { username } = useParams<{ username: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const perPage = 10;

  useEffect(() => {
    async function fetchUserNotes() {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();

      if (userError || !user) {
        setError("User not found");
        toast.error("User not found");
        return;
      }

      const query = supabase
        .from("notes")
        .select("id, title, slug, created_at, tags")
        .eq("user_id", user.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (selectedTag) {
        query.contains("tags", [selectedTag]);
      }

      const { data: noteList, error: noteError } = await query;

      if (noteError) {
        setError("Error loading notes");
        toast.error("Error loading notes");
      } else {
        setNotes(noteList as Note[]);
      }
    }

    fetchUserNotes();
  }, [username, page, selectedTag]);

  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags || [])));

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 text-center"
      >
        <h2 className="text-3xl font-bold text-red-500">Error</h2>
        <p className="text-[var(--text)] mt-4">{error}</p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/"
            className="inline-block px-6 py-3 mt-6 rounded-full bg-[var(--primary)] hover:bg-[var(--hover-bg)] text-white font-semibold transition-colors"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-extrabold text-[var(--text)] bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--text)]"
      >
        {username}'s Digital Garden
      </motion.h1>

      {allTags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-wrap items-center gap-3"
        >
          <span className="text-sm font-medium text-[var(--text)]">
            Filter by tag:
          </span>
          {allTags.map((tag) => (
            <motion.button
              key={tag}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedTag === tag
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--background)] text-[var(--text)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              #{tag}
            </motion.button>
          ))}
        </motion.div>
      )}

      {notes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="p-6 rounded-xl shadow-2xl text-center bg-gradient-to-br from-[var(--background)] to-[var(--hover-bg)]"
        >
          <p className="text-[var(--text)]">No public notes yet.</p>
        </motion.div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <motion.li
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * notes.indexOf(note), duration: 0.5 }}
              className="p-6 rounded-xl shadow-lg bg-gradient-to-br from-[var(--background)] to-[var(--hover-bg)] hover:shadow-2xl transition-shadow duration-300"
            >
              <Link
                to={`/garden/${username}/${note.slug}`}
                className="text-xl font-semibold text-[var(--primary)] hover:underline"
              >
                {note.title}
              </Link>
              <div className="text-sm text-[var(--text)] mt-2">
                {new Date(note.created_at).toLocaleDateString()}
              </div>
              {note.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {note.tags.map((tag: string) => (
                    <motion.span
                      key={tag}
                      whileHover={{ scale: 1.05 }}
                      className="px-2 py-1 rounded-full text-xs bg-[var(--background)] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      #{tag}
                    </motion.span>
                  ))}
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex justify-between items-center mt-6"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center px-4 py-2 rounded-full bg-[var(--primary)] text-white disabled:opacity-50 hover:bg-[var(--hover-bg)] transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Previous
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setPage((p) => p + 1)}
          disabled={notes.length < perPage}
          className="flex items-center px-4 py-2 rounded-full bg-[var(--primary)] text-white disabled:opacity-50 hover:bg-[var(--hover-bg)] transition-colors"
        >
          Next
          <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
        </motion.button>
      </motion.div>
    </div>
  );
}

export default UserGarden;
