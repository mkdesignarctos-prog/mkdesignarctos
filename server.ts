import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const COUNTER_FILE = path.join(process.cwd(), "data", "counter.json");

// Ensure data directory exists
const dataDir = path.dirname(COUNTER_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(COUNTER_FILE)) {
  fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: 0 }));
}

let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase(): any {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("As variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias.");
    }
    supabase = createClient(url, key) as any;
  }
  return supabase;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Basic request logging for debugging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Auth API - Removed manual flows for automatic device ID

  // API handling - Supabase sync
  app.get('/api/sync/alarms', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId || userId === 'null') {
      res.status(400).json({ error: "Missing or invalid x-user-id" });
      return;
    }
    try {
      const db = getSupabase();
      const { data, error } = await db.from('app_users').select('alarms_data').eq('user_id', userId).maybeSingle();
      if (error) {
        console.error('Fetch alarms error details:', JSON.stringify(error, null, 2));
        res.json({ alarms: [] });
        return;
      }
      res.json({ alarms: data?.alarms_data || [] });
    } catch (e: any) {
      console.error('Fetch alarms catch:', e.message);
      res.json({ alarms: [], error: e.message });
    }
  });

  app.post('/api/sync/alarms', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId || userId === 'null') {
      res.status(400).json({ error: "Missing or invalid x-user-id" });
      return;
    }
    try {
      const db = getSupabase();
      const { error } = await db.from('app_users').upsert({ 
        user_id: userId, 
        alarms_data: req.body.alarms 
      }, { onConflict: 'user_id' });
      if (error) {
        console.error('Post alarms error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error('Post alarms catch:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/sync/music/:id', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const musicId = req.params.id;
    if (!userId) {
      res.status(400).json({ error: "Missing x-user-id" });
      return;
    }
    try {
      const db = getSupabase();
      const { data, error } = await db.from('app_music').select('base64_data').eq('music_id', musicId).eq('user_id', userId).single();
      if (error || !data) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({ base64: data.base64_data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/sync/music', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { music_id, base64 } = req.body;
    if (!userId || !music_id || !base64) {
      res.status(400).json({ error: "Missing parameters" });
      return;
    }
    try {
      const db = getSupabase();
      await db.from('app_music').upsert({ music_id, user_id: userId, base64_data: base64 });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/sync/stopwatch', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      const { data, error } = await db.from('app_stopwatch').select('stopwatch_data').eq('user_id', userId).maybeSingle();
      if (error) { res.json({ data: null }); return; }
      res.json({ data: data?.stopwatch_data || null });
    } catch { res.json({ data: null }); }
  });

  app.post('/api/sync/stopwatch', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      await db.from('app_stopwatch').upsert({ user_id: userId, stopwatch_data: req.body.data });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/sync/timers', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      const { data, error } = await db.from('app_timers').select('timer_data').eq('user_id', userId).maybeSingle();
      if (error) { res.json({ data: null }); return; }
      res.json({ data: data?.timer_data || null });
    } catch { res.json({ data: null }); }
  });

  app.post('/api/sync/timers', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      await db.from('app_timers').upsert({ user_id: userId, timer_data: req.body.data });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/sync/activity', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      const { data, error } = await db.from('app_activity').select('activity_data').eq('user_id', userId).maybeSingle();
      if (error) { res.json({ data: null }); return; }
      res.json({ data: data?.activity_data || null });
    } catch { res.json({ data: null }); }
  });

  app.post('/api/sync/activity', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      await db.from('app_activity').upsert({ user_id: userId, activity_data: req.body.data });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Sync Preferences (Theme, etc)
  app.get('/api/sync/preferences', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      const { data, error } = await db.from('app_users').select('*').eq('user_id', userId).maybeSingle();
      if (error) { res.json({ data: null }); return; }
      res.json({ data: data?.preferences || null });
    } catch { res.json({ data: null }); }
  });

  app.post('/api/sync/preferences', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const db = getSupabase();
      await db.from('app_users').upsert({ user_id: userId, preferences: req.body.data }, { onConflict: 'user_id' });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // API handling - counter (connected to database)
  app.get("/api/counter", async (req, res) => {
    try {
      const db = getSupabase();
      const { data, error } = await db.from('app_stats').select('value').eq('id', 'visitor_count').maybeSingle();
      res.json({ count: data?.value || 0 });
    } catch {
      res.json({ count: 0 });
    }
  });

  app.post("/api/counter/increment", async (req, res) => {
    try {
      const db = getSupabase();
      const { data: currentData } = await db.from('app_stats').select('value').eq('id', 'visitor_count').maybeSingle();
      const newValue = (currentData?.value || 0) + 1;
      await db.from('app_stats').upsert({ id: 'visitor_count', value: newValue });
      res.json({ count: newValue });
    } catch (e: any) {
      console.error('Counter increment error:', e.message);
      res.json({ count: 0 });
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
