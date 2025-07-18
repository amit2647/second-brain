import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ForceGraph2D } from "react-force-graph";
import { supabase } from "../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";

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
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchGraph() {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        setError("Please log in to view the graph.");
        toast.error("Please log in to view the graph.");
        return;
      }

      const { data: notes, error: notesError } = (await supabase
        .from("notes")
        .select("id, title")
        .eq("user_id", userId)) as {
        data: NotePartial[] | null;
        error: PostgrestError;
      };

      if (notesError || !notes) {
        setError("Failed to fetch notes.");
        toast.error("Failed to fetch notes.");
        return;
      }

      const { data: links, error: linksError } = (await supabase
        .from("links")
        .select("source_note_id, target_note_id")) as {
        data: LinkPartial[] | null;
        error: PostgrestError;
      };

      if (linksError || !links) {
        setError("Failed to fetch links.");
        toast.error("Failed to fetch links.");
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

  // Dynamically set graph dimensions based on container size
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (graphRef.current) {
        graphRef.current.width(width).height(height);
      }
    }
  }, [graphData]);

  const handleNodeClick = (node: GraphNode) => {
    navigate(`/editor/${node.id}`);
  };

  const zoomIn = () => graphRef.current?.zoom(1.2, 200);
  const zoomOut = () => graphRef.current?.zoom(0.8, 200);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 text-center"
      >
        <h2 className="text-3xl font-bold text-red-400">Error</h2>
        <p className="text-gray-400 mt-4">{error}</p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/"
            className="inline-block px-6 py-3 mt-6 rounded-full bg-teal-500 hover:bg-teal-400 text-white font-semibold transition-colors"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-6"
      >
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
          Note Graph
        </h2>
        {graphData.nodes.length > 0 && (
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={zoomIn}
              className="p-2 rounded-full bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
              aria-label="Zoom in"
            >
              <FontAwesomeIcon icon={faPlus} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={zoomOut}
              className="p-2 rounded-full bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
              aria-label="Zoom out"
            >
              <FontAwesomeIcon icon={faMinus} />
            </motion.button>
          </div>
        )}
      </motion.div>

      {graphData.nodes.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          ref={containerRef}
          className="relative rounded-xl shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-800 to-purple-800 w-full h-[calc(100vh-180px)]"
        >
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="name"
            nodeAutoColorBy="name"
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name || "";
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = "#e2e8f0";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(label, node.x || 0, (node.y || 0) + 10);
              ctx.beginPath();
              ctx.arc(node.x || 0, node.y || 0, 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color || "#38bdf8";
              ctx.fill();
            }}
            linkColor={() => "#38bdf8"} // Updated to a vibrant teal for visibility
            linkWidth={2} // Increased thickness for better visibility
            linkDirectionalArrowLength={4} // Added arrows to indicate direction
            linkDirectionalArrowRelPos={1} // Position arrows at the end of links
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center p-6 rounded-xl shadow-2xl bg-gradient-to-br from-indigo-800 to-purple-800"
        >
          <p className="text-gray-400">
            No notes or links found.{" "}
            <Link to="/editor" className="text-teal-300 hover:underline">
              Create a note
            </Link>{" "}
            to get started!
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default GraphView;
