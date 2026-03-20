import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = 3000;

// Note Schema
const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

// Add text index for efficient search
noteSchema.index({ title: "text", content: "text" });

const Note = mongoose.model("Note", noteSchema);

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  let isConnected = false;

  // Connect to MongoDB
  const isLocalhost = MONGODB_URI?.includes("localhost") || MONGODB_URI?.includes("127.0.0.1");

  if (MONGODB_URI && (MONGODB_URI.startsWith("mongodb://") || MONGODB_URI.startsWith("mongodb+srv://")) && !isLocalhost) {
    try {
      const maskedUri = MONGODB_URI.replace(/\/\/.*@/, "//***:***@");
      console.log(`Attempting to connect to MongoDB: ${maskedUri}`);
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Fail fast
      });
      isConnected = true;
      console.log("Connected to MongoDB");
    } catch (err: any) {
      if (err.name === "MongooseServerSelectionError") {
        console.error("MongoDB connection error: Could not connect to Atlas. Please ensure you have whitelisted '0.0.0.0/0' (Allow Access from Anywhere) in your MongoDB Atlas Network Access settings.");
      } else {
        console.error("MongoDB connection error:", err);
      }
    }
  } else if (isLocalhost) {
    console.error("MONGODB_URI points to localhost. Local MongoDB is not available in this environment. Please use a remote database like MongoDB Atlas.");
  } else {
    console.error("Invalid or missing MONGODB_URI. Please set it in your AI Studio Secrets (Settings -> Secrets).");
  }

  // API Routes
  
  // Health check / Connection status
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: isConnected ? "connected" : "disconnected",
      message: isConnected ? "Database is ready" : "Database connection failed. Check your MONGODB_URI secret."
    });
  });

  // Create a note
  app.post("/api/notes", async (req, res) => {
    if (!isConnected) return res.status(503).json({ error: "Database not connected" });
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      const note = new Note({ title, content });
      await note.save();
      res.status(201).json(note);
    } catch (err) {
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Get all notes (with optional search)
  app.get("/api/notes", async (req, res) => {
    if (!isConnected) return res.status(503).json({ error: "Database not connected" });
    try {
      const { search } = req.query;
      let query = {};
      
      if (search) {
        // Efficient search using MongoDB text index
        query = { $text: { $search: search as string } };
      }

      const notes = await Note.find(query).sort({ createdAt: -1 });
      res.json(notes);
    } catch (err) {
      console.error("Error fetching notes:", err);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // Get a single note
  app.get("/api/notes/:id", async (req, res) => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) return res.status(404).json({ error: "Note not found" });
      res.json(note);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });

  // Update a note
  app.put("/api/notes/:id", async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      const note = await Note.findByIdAndUpdate(
        req.params.id,
        { title, content },
        { new: true, runValidators: true }
      );
      if (!note) return res.status(404).json({ error: "Note not found" });
      res.json(note);
    } catch (err) {
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  // Delete a note
  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const note = await Note.findByIdAndDelete(req.params.id);
      if (!note) return res.status(404).json({ error: "Note not found" });
      res.json({ message: "Note deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
