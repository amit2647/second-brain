import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BacklinkPayload {
  note_id: string;
  content: string;
  user_id: string;
}

interface Note {
  id: string;
  slug: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Update to your Vercel URL in production
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.error(`Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: "Only POST requests are supported" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  try {
    if (!req.body) {
      console.error("Request body is empty or missing");
      return new Response(
        JSON.stringify({ error: "Request body is empty or missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const contentType = req.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      console.error(`Invalid Content-Type: ${contentType}`);
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    let payload: BacklinkPayload;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      if (!text) {
        console.error("Empty request body");
        return new Response(JSON.stringify({ error: "Empty request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      payload = JSON.parse(text);
      console.log("Parsed payload:", payload);
    } catch (err) {
      console.error("JSON parsing error:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload", details: err.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { note_id, content, user_id } = payload;
    if (!note_id || !content || !user_id) {
      console.error("Missing fields:", { note_id, content, user_id });
      return new Response(
        JSON.stringify({ error: "Missing note_id, content, or user_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use service role key to bypass RLS
    );

    // Parse [[slug]] patterns
    const backlinkRegex = /\[\[([^\]]+)\]\]/g;
    const backlinks = [...content.matchAll(backlinkRegex)].map((match) =>
      match[1].trim(),
    );
    console.log("Extracted backlinks:", backlinks);

    // Clear existing links
    const { error: deleteError } = await supabase
      .from("links")
      .delete()
      .eq("source_note_id", note_id);
    if (deleteError) {
      console.error("Error deleting existing links:", deleteError);
      return new Response(
        JSON.stringify({
          error: "Failed to clear existing links",
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Fetch user notes to resolve slugs
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id, slug")
      .eq("user_id", user_id);
    if (notesError) {
      console.error("Error fetching notes:", notesError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch notes",
          details: notesError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
    console.log("Fetched notes:", notes);

    // Insert new links
    const insertedLinks = [];
    for (const slug of backlinks) {
      // Handle trailing dash in slug matching
      const targetNote = notes.find(
        (note: Note) =>
          note.slug === slug ||
          note.slug === slug + "-" ||
          note.slug === slug.replace(/-$/, ""),
      );
      if (targetNote && targetNote.id !== note_id) {
        console.log(
          `Inserting link: ${note_id} -> ${targetNote.id} (slug: ${slug})`,
        );
        const { error: insertError } = await supabase
          .from("links")
          .insert([{ source_note_id: note_id, target_note_id: targetNote.id }]);
        if (insertError) {
          console.error("Error inserting link for slug:", slug, insertError);
        } else {
          insertedLinks.push({
            source_note_id: note_id,
            target_note_id: targetNote.id,
            slug,
          });
        }
      } else {
        console.log(`No valid target note found for slug: ${slug}`);
      }
    }
    console.log("Inserted links:", insertedLinks);

    return new Response(
      JSON.stringify({
        message: "Backlinks processed successfully",
        insertedLinks,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
