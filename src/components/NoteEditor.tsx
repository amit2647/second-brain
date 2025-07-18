import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import { MentionsInput, Mention } from "react-mentions";
// import { marked } from "marked";

function NoteEditor() {
  const { noteId } = useParams<{ noteId?: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [mentionData, setMentionData] = useState<
    { id: string; display: string }[]
  >([]);

  useEffect(() => {
    async function fetchNoteAndSlugs() {
      if (noteId) {
        const { data, error } = await supabase
          .from("notes")
          .select("title, content, tags, is_public")
          .eq("id", noteId)
          .single();
        if (error) {
          console.error("Error fetching note:", error);
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
        console.error("Error fetching slugs:", notesError);
        return;
      }
      setMentionData(
        notes?.map((note) => ({ id: note.id, display: note.slug })) ?? [],
      );
    }
    fetchNoteAndSlugs();
  }, [noteId]);

  const handleSave = async () => {
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      alert("You must be logged in to save notes.");
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
      user_id: user.id, // ✅ Explicitly set user_id for RLS compliance
    };

    if (noteId) {
      ({ data, error } = await supabase
        .from("notes")
        .update(payload)
        .eq("id", noteId)
        .eq("user_id", user.id) // ✅ Ensure the user owns the note
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
      alert(error.message);
      return;
    }

    alert(noteId ? "Note updated!" : "Note saved!");

    // 🧠 Trigger backlink parser
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
          console.error("Backlink parsing failed:", await response.json());
        }
      } catch (err) {
        console.error("Error calling backlink parser:", err);
      }
    }
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

  const handleDelete = async () => {
    const confirmDelete = confirm("Are you sure you want to delete this note?");
    if (!confirmDelete || !noteId) return;

    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("user_id")
      .eq("id", noteId)
      .single();

    if (fetchError || !note) {
      alert("Failed to fetch note. Cannot delete.");
      return;
    }

    if (note.user_id !== userId) {
      alert("You are not authorized to delete this note.");
      return;
    }

    // First delete links where this note is the source or target
    const { error: linkDeleteError } = await supabase
      .from("links")
      .delete()
      .or(`source_note_id.eq.${noteId},target_note_id.eq.${noteId}`);

    if (linkDeleteError) {
      alert("Failed to delete links: " + linkDeleteError.message);
      return;
    }

    // Now delete the note itself
    const { error: noteDeleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId);

    if (noteDeleteError) {
      alert("Delete failed: " + noteDeleteError.message);
      return;
    }

    alert("Note deleted.");
    window.location.href = "/"; // or use `navigate("/dashboard")` if using `useNavigate`
  };

  // const handleExportHTML = async () => {
  //   const html = await marked(content);
  //   const blob = new Blob([html], { type: "text/html" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `${title}.html`;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold mb-4">Second Brain</h1>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded"
      />
      <MentionsInput
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write in MDX (e.g., [[other-note-slug]])"
        className="border p-2 rounded h-40"
      >
        <Mention
          trigger="["
          data={mentionData}
          markup="[[__display__]]"
          displayTransform={(_id, display) => `[[${display}]]`}
          appendSpaceOnAdd
        />
      </MentionsInput>
      <input
        type="text"
        placeholder="Tags (comma-separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="border p-2 rounded"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Public
      </label>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="bg-blue-500 text-white p-2 rounded"
        >
          {noteId ? "Update Note" : "Save Note"}
        </button>
        <button
          onClick={handleExportMarkdown}
          className="bg-gray-500 text-white p-2 rounded"
        >
          Export as Markdown
        </button>
        {/* <button
          onClick={handleExportHTML}
          className="bg-gray-500 text-white p-2 rounded"
        >
          Export as HTML
        </button> */}
        {noteId && (
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white p-2 rounded"
          >
            Delete Note
          </button>
        )}
      </div>
    </div>
  );
}

export default NoteEditor;
