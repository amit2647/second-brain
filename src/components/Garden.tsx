import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import { MDXProvider } from "@mdx-js/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import { toast } from "react-toastify";

interface AnchorProps {
  href?: string;
  children: React.ReactNode;
  [key: string]: unknown;
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="p-6 text-center">
      <h2 className="text-2xl font-bold text-red-500">Error</h2>
      <p className="text-gray-500 mt-2">{message}</p>
      <Link to="/" className="btn btn-primary mt-4 inline-block">
        Go to Dashboard
      </Link>
    </div>
  );
}

function Garden() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [MDXContent, setMDXContent] = useState<React.ComponentType | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNote() {
      setIsLoading(true);
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();

      if (userError || !user) {
        setError("User not found");
        setIsLoading(false);
        return;
      }

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
        setIsLoading(false);
        return;
      }

      setNote(noteData as Note);

      const backlinkRegex = /\[\[([^\]]+)\]\]/g;
      const foundBacklinks = [...noteData.content.matchAll(backlinkRegex)].map(
        (match) => match[1],
      );
      setBacklinks(foundBacklinks);

      try {
        const { default: EvaluatedComponent } = await evaluate(
          noteData.content,
          runtime,
        );
        setMDXContent(() => EvaluatedComponent);
      } catch (err) {
        console.error("Export failed:", err);
        toast.error("Failed to render note content.");
        setError("Failed to render note content");
      }
      setIsLoading(false);
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
            className="text-[var(--text)] hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded"
          >
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          {...props}
          className="text-[var(--text)] hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded"
        >
          {children}
        </a>
      );
    },
  };

  if (error) {
    return <ErrorPage message={error} />;
  }

  if (isLoading || !note || !MDXContent) {
    return (
      <div className="flex justify-center p-6 text-[var(--text)]">
        <FontAwesomeIcon icon={faSpinner} spin />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--text)]">{note.title}</h1>
      <div className="prose prose-lg max-w-none dark:prose-invert text-[var(--text)]">
        <MDXProvider components={components}>
          <MDXContent />
        </MDXProvider>
      </div>

      {backlinks.length > 0 && (
        <div className="bg-[var(--background)] border border-[var(--border)] p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-[var(--text)]">
            Linked Notes
          </h3>
          <ul className="space-y-2">
            {backlinks.map((linkedSlug) => (
              <li key={linkedSlug}>
                <Link
                  to={`/garden/${username}/${linkedSlug}`}
                  className="block hover:bg-[var(--hover-bg)] text-[var(--text)] px-3 py-1 rounded"
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
