import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import { MDXProvider } from "@mdx-js/react";
import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";

interface AnchorProps {
  href?: string;
  children: React.ReactNode;
  [key: string]: unknown;
}

function Garden() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [MDXContent, setMDXContent] = useState<React.ComponentType | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [backlinks, setBacklinks] = useState<string[]>([]);

  useEffect(() => {
    async function fetchNote() {
      // Fetch user by username
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();

      if (userError || !user) {
        setError("User not found");
        return;
      }

      // Fetch public note by slug and user_id
      const { data: noteData, error: noteError } = await supabase
        .from("notes")
        .select(
          "id, user_id, title, slug, content, tags, is_public, created_at",
        )
        .eq("user_id", user.id)
        .eq("slug", slug)
        .eq("is_public", true)
        .single();

      if (noteError || !noteData) {
        setError("Note not found or not public");
        return;
      }

      setNote(noteData as Note);

      // Parse backlinks for clickable links
      const backlinkRegex = /\[\[([^\]]+)\]\]/g;
      const foundBacklinks = [...noteData.content.matchAll(backlinkRegex)].map(
        (match) => match[1],
      );
      setBacklinks(foundBacklinks);

      // Evaluate MDX content
      try {
        const { default: EvaluatedComponent } = await evaluate(
          noteData.content,
          runtime,
        );
        setMDXContent(() => EvaluatedComponent);
      } catch (err) {
        console.error("MDX evaluation failed:", err);
        setError("Failed to render note content");
      }
    }

    fetchNote();
  }, [username, slug]);

  const components = {
    a: ({ href, children, ...props }: AnchorProps) => {
      if (href?.startsWith("[[") && href.endsWith("]]")) {
        const linkedSlug = href.slice(2, -2);
        return (
          <Link
            to={`/garden/${username}/${linkedSlug}`}
            {...props}
            className="text-blue-500 hover:underline"
          >
            {children}
          </Link>
        );
      }
      return (
        <a href={href} {...props} className="text-blue-500 hover:underline">
          {children}
        </a>
      );
    },
  };

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  if (!note || !MDXContent) {
    return <div className="p-4 text-gray-500 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{note.title}</h1>
      <div className="prose prose-lg">
        <MDXProvider components={components}>
          <MDXContent />
        </MDXProvider>
      </div>
      {backlinks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Linked Notes</h3>
          <ul className="list-disc pl-5">
            {backlinks.map((linkedSlug) => (
              <li key={linkedSlug}>
                <Link
                  to={`/garden/${username}/${linkedSlug}`}
                  className="text-blue-500 hover:underline"
                >
                  {linkedSlug}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Garden;
