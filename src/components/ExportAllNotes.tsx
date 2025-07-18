import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { marked } from "marked";

function ExportAllNotes() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExportZip = async (format: "markdown" | "html") => {
    setIsLoading(true);
    try {
      const { data: notes, error } = await supabase
        .from("notes")
        .select("title, slug, content")
        .eq("is_public", true)
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        alert(error.message);
        return;
      }

      const zip = new JSZip();
      for (const note of notes as Note[]) {
        const fileName = `${note.slug}.${format === "markdown" ? "md" : "html"}`;
        const content =
          format === "markdown" ? note.content : await marked(note.content);
        zip.file(fileName, content);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `public-notes-${format}.zip`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export notes");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => handleExportZip("markdown")}
        disabled={isLoading}
        className="bg-green-500 text-white p-2 rounded disabled:opacity-50"
      >
        {isLoading ? "Exporting..." : "Export Public Notes as Markdown ZIP"}
      </button>
      <button
        onClick={() => handleExportZip("html")}
        disabled={isLoading}
        className="bg-green-500 text-white p-2 rounded disabled:opacity-50"
      >
        {isLoading ? "Exporting..." : "Export Public Notes as HTML ZIP"}
      </button>
    </div>
  );
}

export default ExportAllNotes;
