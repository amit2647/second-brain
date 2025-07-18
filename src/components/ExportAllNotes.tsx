import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Note } from "../types";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { marked } from "marked";
import { toast } from "react-toastify";

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
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (!notes || notes.length === 0) {
        toast.info("No public notes to export.");
        setIsLoading(false);
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
      toast.success(`Exported public notes as ${format.toUpperCase()} ZIP`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export notes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--text)]">Export Notes</h1>
      <div
        className="p-6 rounded-lg shadow-md space-y-4 border border-[var(--border)]"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--text)",
        }}
      >
        <p className="text-[var(--text-light)]">
          Export all public notes as a ZIP file.
        </p>

        {isLoading && (
          <div className="flex justify-center text-[var(--text)]">
            <div className="animate-spin text-2xl">⏳</div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExportZip("markdown")}
            disabled={isLoading}
            className="btn btn-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Exporting..." : "Export as Markdown ZIP"}
          </button>
          <button
            onClick={() => handleExportZip("html")}
            disabled={isLoading}
            className="btn btn-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Exporting..." : "Export as HTML ZIP"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportAllNotes;
