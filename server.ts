import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const ALERTS_FILE = path.join(process.cwd(), "data", "alerts.json");
const ROUTES_FILE = path.join(process.cwd(), "data", "routes.json");

// Helper to read/write JSON
const readData = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeData = (file: string, data: any) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- API Endpoints ---

// Register
app.post("/api/register", (req, res) => {
  const { name, email, phone, emergency } = req.body;
  const users = readData(USERS_FILE);
  const newUser = { id: "u" + Date.now(), name, email, phone, emergency };
  users.push(newUser);
  writeData(USERS_FILE, users);
  res.json({ success: true, user: newUser });
});

// Login
app.post("/api/login", (req, res) => {
  const { email, phone } = req.body;
  const users = readData(USERS_FILE);
  const user = users.find((u: any) => u.email === email && u.phone === phone);
  if (user) {
    res.json({ success: true, userId: user.id, user });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// SOS Alert
app.post("/api/sos", (req, res) => {
  const { userId, lat, lng, name, phone, email } = req.body;
  const alerts = readData(ALERTS_FILE);
  const newAlert = {
    id: "a" + Date.now(),
    userId,
    name,
    phone,
    email,
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
  const alertIndex = alerts.findIndex((a: any) => a.id === id);
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
  res.json({ success: true, route: newRoute });
});

// Get User Routes
app.get("/api/routes/:userId", (req, res) => {
  const { userId } = req.params;
  const routes = readData(ROUTES_FILE);
  const userRoutes = routes.filter((r: any) => r.userId === userId);
  res.json(userRoutes);
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
