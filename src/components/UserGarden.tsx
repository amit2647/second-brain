import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";

function UserGarden() {
  const { username } = useParams<{ username: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserNotes() {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();

      if (userError || !user) {
        setError("User not found");
        return;
      }

      const { data: noteList, error: noteError } = await supabase
        .from("notes")
        .select("id, title, slug, created_at, tags")
        .eq("user_id", user.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (noteError) {
        setError("Error loading notes");
      } else {
        setNotes(noteList as Note[]);
      }
    }

    fetchUserNotes();
  }, [username]);

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">
        {username}&apos;s Digital Garden
      </h1>
      {notes.length === 0 ? (
        <p className="text-gray-500">No public notes yet.</p>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                to={`/garden/${username}/${note.slug}`}
                className="text-xl text-blue-600 hover:underline"
              >
                {note.title}
              </Link>
              <div className="text-sm text-gray-500">
                {new Date(note.created_at).toLocaleDateString()}
              </div>
              {note.tags?.length > 0 && (
                <div className="text-sm text-gray-700 mt-1">
                  Tags:{" "}
                  {note.tags.map((tag: string) => (
                    <span key={tag} className="mr-2">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UserGarden;
