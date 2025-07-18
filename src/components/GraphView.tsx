import { useEffect, useState } from "react";
import { ForceGraph2D } from "react-force-graph";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import type { PostgrestError } from "@supabase/supabase-js";

// Define partial types for query results
interface NotePartial {
  id: string;
  title: string;
}

interface LinkPartial {
  source_note_id: string;
  target_note_id: string;
}

interface GraphNode {
  id: string;
  name: string;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

function GraphView() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGraph() {
      // Fetch notes with only id and title
      const { data: notes, error: notesError } = (await supabase
        .from("notes")
        .select("id, title")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)) as {
        data: NotePartial[] | null;
        error: PostgrestError;
      };

      if (notesError || !notes) {
        console.error("Error fetching notes:", notesError);
        return;
      }

      // Fetch links with only source_note_id and target_note_id
      const { data: links, error: linksError } = (await supabase
        .from("links")
        .select("source_note_id, target_note_id")) as {
        data: LinkPartial[] | null;
        error: PostgrestError;
      };

      if (linksError || !links) {
        console.error("Error fetching links:", linksError);
        return;
      }

      setGraphData({
        nodes: notes.map((note) => ({ id: note.id, name: note.title })),
        links: links.map((link) => ({
          source: link.source_note_id,
          target: link.target_note_id,
        })),
      });
    }

    fetchGraph();
  }, []);

  const handleNodeClick = (node: GraphNode) => {
    navigate(`/editor/${node.id}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Note Graph</h2>
      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          graphData={graphData}
          nodeLabel="name"
          nodeAutoColorBy="name"
          onNodeClick={handleNodeClick}
          width={800}
          height={600}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
        />
      ) : (
        <p>No notes or links found. Create some notes to visualize!</p>
      )}
    </div>
  );
}

export default GraphView;
