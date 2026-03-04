import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("study_tracker.db");

const app = express();
app.use(express.json());

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS study_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'BookOpen'
  );

  CREATE TABLE IF NOT EXISTS study_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_type_id INTEGER NOT NULL,
    minutes INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_type_id) REFERENCES study_types(id)
  );
`);

async function startServer() {
  const PORT = 3000;

  // API Routes
  app.get("/api/study-types", (req, res) => {
    const types = db.prepare("SELECT * FROM study_types").all();
    res.json(types);
  });

  app.post("/api/study-types", (req, res) => {
    const { name, color, icon } = req.body;
    try {
      const info = db.prepare("INSERT INTO study_types (name, color, icon) VALUES (?, ?, ?)").run(name, color || '#3b82f6', icon || 'BookOpen');
      res.json({ id: info.lastInsertRowid, name, color, icon });
    } catch (err) {
      res.status(400).json({ error: "Study type already exists or invalid data" });
    }
  });

  app.get("/api/study-types/:id/total", (req, res) => {
    const { id } = req.params;
    const result = db.prepare("SELECT SUM(minutes) as total FROM study_logs WHERE study_type_id = ?").get(id);
    res.json({ total: result.total || 0 });
  });

  app.get("/api/total-study-time", (req, res) => {
    const result = db.prepare("SELECT SUM(minutes) as total FROM study_logs").get();
    res.json({ total: result.total || 0 });
  });

  app.delete("/api/study-types/:id", (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      db.prepare("DELETE FROM study_logs WHERE study_type_id = ?").run(id);
      db.prepare("DELETE FROM study_types WHERE id = ?").run(id);
    })();
    res.json({ success: true });
  });

  app.delete("/api/study-logs/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM study_logs WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/study-logs", (req, res) => {
    const { start_date, end_date, study_type_id } = req.query;
    let query = "SELECT sl.*, st.name as type_name, st.color FROM study_logs sl JOIN study_types st ON sl.study_type_id = st.id WHERE sl.date BETWEEN ? AND ?";
    const params = [start_date, end_date];

    if (study_type_id) {
      query += " AND sl.study_type_id = ?";
      params.push(study_type_id);
    }

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  });

  app.post("/api/study-logs", (req, res) => {
    const { study_type_id, minutes, date } = req.body;
    if (!study_type_id || !minutes || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const info = db.prepare("INSERT INTO study_logs (study_type_id, minutes, date) VALUES (?, ?, ?)").run(study_type_id, minutes, date);
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}
