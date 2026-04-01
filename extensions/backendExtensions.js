import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// Manual Firebase initialization for Node.js to avoid frontend import issues
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let db = null;

try {
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("[Firebase] Backend initialized successfully.");
  } else {
    console.warn("[Firebase] Backend config not found at:", configPath);
  }
} catch (err) {
  console.error("[Firebase] Backend initialization failed:", err);
}

export const extensionEvents = new EventEmitter();

// --- Feature 4: Notification System ---
extensionEvents.on("sos_triggered", (alert) => {
  console.log(`[Notification Service] TRIGGERED for alert ${alert.id}`);
  console.log(`[SMS] Sending alert to emergency contacts for ${alert.name}...`);
  console.log(`[Email] Sending detailed report to ${alert.email}...`);
  // In a real app, you'd call Twilio or SendGrid here.
});

// --- Feature 3: Firebase Integration Layer (Mirroring) ---
export const setupFirebaseMirror = (io) => {
  console.log("[Firebase Mirror] Initialized");

  const mirrorToFirestore = async (collectionName, data) => {
    if (!db) return;
    try {
      // We only mirror the NEWEST item for simplicity in this real-time sync demo
      const latestItem = Array.isArray(data) ? data[0] : data;
      if (!latestItem) return;

      const colRef = collection(db, collectionName);
      await addDoc(colRef, {
        ...latestItem,
        mirroredAt: serverTimestamp(),
        source: "local_json"
      });
      console.log(`[Firebase Mirror] Synced new item to ${collectionName}`);
    } catch (err) {
      console.error(`[Firebase Mirror] Error syncing to ${collectionName}:`, err);
    }
  };

  extensionEvents.on("data_updated", ({ type, data }) => {
    if (type === "alert") mirrorToFirestore("alerts", data);
    if (type === "route") mirrorToFirestore("routes", data);
    if (type === "user") mirrorToFirestore("users", data);
  });
};

// --- Feature 2: Live Location Tracking Service ---
const liveLocations = new Map();

export const setupLiveTracking = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Live Tracking] Socket connected: ${socket.id}`);

    socket.on("update_location", (data) => {
      // data: { userId, lat, lng, timestamp }
      const { userId, lat, lng } = data;
      if (!userId) return;

      const locationUpdate = {
        userId,
        lat,
        lng,
        timestamp: Date.now()
      };

      liveLocations.set(userId, locationUpdate);
      
      // Broadcast to all (especially admins)
      // Use 'location_update' to match frontend receiver
      io.emit("location_update", locationUpdate);
    });

    socket.on("disconnect", () => {
      console.log(`[Live Tracking] Socket disconnected: ${socket.id}`);
    });
  });
};
