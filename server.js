/**
 * System Architecture:
 * 
 * [ Frontend (React/Vite) ] <--- Socket.io / REST ---> [ Backend (Express/Node) ]
 *          |                                                |
 *          | (Client-side AI)                               | (Server-side Logic)
 *          v                                                v
 * [ Google Gemini API ]                            [ Local JSON DB / Firestore Mirror ]
 * 
 * Modules:
 * 1. AI Safety Prediction: Heuristic model in lib/safetyModel.js
 * 2. Intelligent SOS: Client-side hook with battery/movement monitoring
 * 3. Heatmap: Leaflet.heat overlay with real-time report data
 * 4. Community Feedback: Report/Rating system with persistent storage
 * 5. Offline Mode: Service Worker with background sync
 * 6. Auth: JWT-based secure layer
 * 7. Admin: Recharts-powered analytics dashboard
 */

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { extensionEvents, setupFirebaseMirror, setupLiveTracking } from "./extensions/backendExtensions.js";
import { calculateSafetyScore } from "./lib/safetyModel.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const JWT_SECRET = process.env.JWT_SECRET || "safewalk-secret-key";

// Initialize Extensions
setupFirebaseMirror(io);
setupLiveTracking(io);

app.use(cors());
app.use(express.json());

// --- Logging Middleware ---
const LOGS_FILE = path.join(process.cwd(), "data", "logs.json");
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip
    };
    try {
      const logs = JSON.parse(fs.readFileSync(LOGS_FILE, "utf8"));
      logs.push(log);
      fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(-500), null, 2)); // Keep last 500 logs
    } catch (e) {
      console.error("Logging error:", e);
    }
  }
  next();
});

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const ALERTS_FILE = path.join(process.cwd(), "data", "alerts.json");
const ROUTES_FILE = path.join(process.cwd(), "data", "routes.json");
const REPORTS_FILE = path.join(process.cwd(), "data", "reports.json");
const RATINGS_FILE = path.join(process.cwd(), "data", "ratings.json");

// Mock Crime Dataset
const MOCK_CRIME_DATA = [
  { id: 1, lat: 19.0760, lng: 72.8777, type: "Theft", severity: "Medium" },
  { id: 2, lat: 19.0850, lng: 72.8850, type: "Harassment", severity: "High" },
  { id: 3, lat: 19.0650, lng: 72.8650, type: "Robbery", severity: "High" }
];

// Helper to read/write JSON
const readData = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Endpoints ---

// Register
app.post("/api/register", (req, res) => {
  const { name, email, phone, emergency } = req.body;
  const users = readData(USERS_FILE);
  const newUser = { id: "u" + Date.now(), name, email, phone, emergency, role: "user" };
  users.push(newUser);
  writeData(USERS_FILE, users);
  
  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);
  
  extensionEvents.emit("data_updated", { type: "user", data: newUser });
  res.json({ success: true, user: newUser, token });
});

// Login
app.post("/api/login", (req, res) => {
  const { email, phone } = req.body;
  const users = readData(USERS_FILE);
  const user = users.find((u) => u.email === email && u.phone === phone);
  if (user) {
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ success: true, userId: user.id, user, token });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// --- Safety Prediction APIs ---
app.post("/api/predict-safety", (req, res) => {
  const { lat, lng, time } = req.body;
  const reports = readData(REPORTS_FILE);
  const score = calculateSafetyScore(lat, lng, time || new Date().toISOString(), MOCK_CRIME_DATA, reports);
  res.json({ score });
});

app.post("/api/safe-route", (req, res) => {
  const { start, end } = req.body;
  // Simplified safe route logic: just return the safety score for the midpoint
  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;
  const reports = readData(REPORTS_FILE);
  const score = calculateSafetyScore(midLat, midLng, new Date().toISOString(), MOCK_CRIME_DATA, reports);
  res.json({ score, recommendation: score > 70 ? "Safe" : "Caution Recommended" });
});

// --- Community Feedback APIs ---
app.post("/api/reports", authenticateToken, (req, res) => {
  const { lat, lng, type, description } = req.body;
  const reports = readData(REPORTS_FILE);
  const newReport = {
    id: "rep" + Date.now(),
    userId: req.user.id,
    lat,
    lng,
    type,
    description,
    timestamp: Date.now()
  };
  reports.push(newReport);
  writeData(REPORTS_FILE, reports);
  res.json({ success: true, report: newReport });
});

app.post("/api/ratings", authenticateToken, (req, res) => {
  const { routeId, rating, comment } = req.body;
  const ratings = readData(RATINGS_FILE);
  const newRating = {
    id: "rat" + Date.now(),
    userId: req.user.id,
    routeId,
    rating,
    comment,
    timestamp: Date.now()
  };
  ratings.push(newRating);
  writeData(RATINGS_FILE, ratings);
  res.json({ success: true, rating: newRating });
});

// --- Heatmap Data ---
app.get("/api/heatmap", (req, res) => {
  const reports = readData(REPORTS_FILE);
  const heatmapData = [
    ...MOCK_CRIME_DATA.map(c => [c.lat, c.lng, 0.8]),
    ...reports.map(r => [r.lat, r.lng, 0.5])
  ];
  res.json(heatmapData);
});

// SOS Alert
app.post("/api/sos", (req, res) => {
  const { userId, lat, lng, name, phone, email, photoURL } = req.body;
  const alerts = readData(ALERTS_FILE);
  const newAlert = {
    id: "a" + Date.now(),
    userId,
    name,
    phone,
    email,
    photoURL,
    lat,
    lng,
    time: new Date().toLocaleTimeString(),
    status: "active",
    timestamp: Date.now()
  };
  alerts.unshift(newAlert);
  writeData(ALERTS_FILE, alerts);
  
  // Real-time emit
  io.emit("new_alert", newAlert);
  
  // Extension triggers
  extensionEvents.emit("sos_triggered", newAlert);
  extensionEvents.emit("data_updated", { type: "alert", data: newAlert });
  
  res.json({ success: true, alert: newAlert });
});

// Get Alerts
app.get("/api/alerts", (req, res) => {
  const alerts = readData(ALERTS_FILE);
  res.json(alerts);
});

// Resolve Alert
app.post("/api/alerts/resolve", (req, res) => {
  const { id } = req.body;
  const alerts = readData(ALERTS_FILE);
  const alertIndex = alerts.findIndex((a) => a.id === id);
  if (alertIndex > -1) {
    alerts[alertIndex].status = "resolved";
    writeData(ALERTS_FILE, alerts);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Save Route
app.post("/api/routes", (req, res) => {
  const { userId, startAddr, endAddr, distance, duration, safetyScore, route } = req.body;
  const routes = readData(ROUTES_FILE);
  const newRoute = {
    id: "r" + Date.now(),
    userId,
    startAddr,
    endAddr,
    distance,
    duration,
    safetyScore,
    route,
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString()
  };
  routes.unshift(newRoute);
  writeData(ROUTES_FILE, routes);
  extensionEvents.emit("data_updated", { type: "route", data: newRoute });
  res.json({ success: true, route: newRoute });
});

// Get User Routes
app.get("/api/routes/:userId", (req, res) => {
  const { userId } = req.params;
  const routes = readData(ROUTES_FILE);
  const userRoutes = routes.filter((r) => r.userId === userId);
  res.json(userRoutes);
});

// Update User Profile
app.post("/api/user/update", authenticateToken, (req, res) => {
  const { name, phone, emergency, photoURL } = req.body;
  const users = readData(USERS_FILE);
  const userIndex = users.findIndex((u) => u.id === req.user.id);
  if (userIndex > -1) {
    users[userIndex] = { ...users[userIndex], name, phone, emergency, photoURL };
    writeData(USERS_FILE, users);
    extensionEvents.emit("data_updated", { type: "user", data: users[userIndex] });
    res.json({ success: true, user: users[userIndex] });
  } else {
    res.status(404).json({ success: false, message: "User not found" });
  }
});

// Update User Settings
app.post("/api/user/settings", authenticateToken, (req, res) => {
  const { settings } = req.body;
  const users = readData(USERS_FILE);
  const userIndex = users.findIndex((u) => u.id === req.user.id);
  if (userIndex > -1) {
    users[userIndex] = { ...users[userIndex], settings };
    writeData(USERS_FILE, users);
    res.json({ success: true, user: users[userIndex] });
  } else {
    res.status(404).json({ success: false, message: "User not found" });
  }
});

// Get Logs (Admin only - simplified check)
app.get("/api/admin/logs", authenticateToken, (req, res) => {
  const logs = readData(LOGS_FILE);
  res.json(logs);
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), 'vite.config.js'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
