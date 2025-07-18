import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import { MentionsInput, Mention } from "react-mentions";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";
import { marked } from "marked";

function NoteEditor() {
  const { noteId } = useParams<{ noteId?: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [mentionData, setMentionData] = useState<
    { id: string; display: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchNoteAndSlugs() {
      if (noteId) {
        const { data, error } = await supabase
          .from("notes")
          .select("title, content, tags, is_public")
          .eq("id", noteId)
          .single();
        if (error) {
          toast.error("Error fetching note.");
          return;
        }
        if (data) {
          setTitle(data.title);
          setContent(data.content);
          setTags(data.tags.join(", "));
          setIsPublic(data.is_public);
        }
      }

      const { data: notes, error: notesError } = await supabase
        .from("notes")
        .select("id, slug")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);
      if (notesError) {
        toast.error("Error fetching slugs.");
        return;
      }
      setMentionData(
        notes?.map((note) => ({ id: note.id, display: note.slug })) ?? [],
      );
    }
    fetchNoteAndSlugs();
  }, [noteId]);

  const handleSave = async () => {
    setIsLoading(true);
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      toast.error("You must be logged in to save notes.");
      setIsLoading(false);
      return;
    }

    const { data: existingNote } = await supabase
      .from("notes")
      .select("id")
      .eq("slug", slug)
      .neq("id", noteId || "")
      .single();
    if (existingNote) {
      toast.error("A note with this title already exists.");
      setIsLoading(false);
      return;
    }

    let data: Note | null = null;
    let error = null;

    const payload = {
      title,
      slug,
      content,
      tags: tags.split(",").map((tag) => tag.trim()),
      is_public: isPublic,
      user_id: user.id,
    };

    if (noteId) {
      ({ data, error } = await supabase
        .from("notes")
        .update(payload)
        .eq("id", noteId)
        .eq("user_id", user.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from("notes")
        .insert([payload])
        .select()
        .single());
    }

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success(noteId ? "Note updated!" : "Note saved!");

    if (user && data) {
      try {
        const response = await fetch(import.meta.env.VITE_EDGE_FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note_id: data!.id,
            content,
            user_id: user.id,
          }),
        });
        if (!response.ok) {
          toast.error("Backlink parsing failed.");
        }
      } catch (err) {
        console.error("Export failed:", err);
        toast.error("Error calling backlink parser.");
      }
    }
    setIsLoading(false);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHTML = async () => {
    const html = await marked(content);
    const sanitizedHTML = DOMPurify.sanitize(html);
    const blob = new Blob([sanitizedHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?") || !noteId)
      return;

    setIsLoading(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", noteId)
      .single();

    if (fetchError || !note) {
      toast.error("Failed to fetch note.");
      setIsLoading(false);
      return;
    }

    if (note.user_id !== userId) {
      toast.error("You are not authorized to delete this note.");
      setIsLoading(false);
      return;
    }

    const { error: linkDeleteError } = await supabase
      .from("links")
      .delete()
      .or(`source_note_id.eq.${noteId},target_note_id.eq.${noteId}`);

    if (linkDeleteError) {
      toast.error("Failed to delete links.");
      setIsLoading(false);
      return;
    }

    const { error: noteDeleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId);

    if (noteDeleteError) {
      toast.error("Delete failed.");
      setIsLoading(false);
      return;
    }

    toast.success("Note deleted.");
    window.location.href = "/";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--text)]">Note Editor</h1>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="Enter note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-1"
            disabled={isLoading}
          />
        </div>
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Content (MDX)
          </label>
          <MentionsInput
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write in MDX (e.g., [[other-note-slug]])"
            className="mentions-input input mt-1 resize-y min-h-[200px]"
            disabled={isLoading}
          >
            <Mention
              trigger="["
              data={mentionData}
              markup="[[__display__]]"
              displayTransform={(_id, display) => `[[${display}]]`}
              appendSpaceOnAdd
            />
          </MentionsInput>
        </div>
        <div>
          <label
            htmlFor="tags"
            className="block text-sm font-medium text-[var(--text)]"
          >
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            placeholder="e.g., work, personal"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input mt-1"
            disabled={isLoading}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <span className="text-sm text-[var(--text)]">Make Public</span>
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : noteId ? "Update Note" : "Save Note"}
          </button>
          <button
            onClick={handleExportMarkdown}
            className="btn btn-accent"
            disabled={isLoading}
          >
            Export as Markdown
          </button>
          <button
            onClick={handleExportHTML}
            className="btn btn-accent"
            disabled={isLoading}
          >
            Export as HTML
          </button>
          {noteId && (
            <button
              onClick={handleDelete}
              className="btn bg-red-500 hover:bg-red-600"
              disabled={isLoading}
            >
              Delete Note
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
