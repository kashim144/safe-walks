import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  User, 
  Activity, 
  MapPin, 
  PhoneCall, 
  Mail, 
  Settings, 
  X, 
  UserPlus, 
  Sparkles,
  Clock, 
  CheckCircle, 
  Navigation, 
  FileText,
  Shield,
  BarChart as ChartIcon,
  TrendingUp,
  Globe
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, Circle, useMapEvents, Tooltip as LeafletTooltip } from 'react-leaflet';
import { io } from 'socket.io-client';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType, getTimestampMillis } from '../lib/utils';
import { AnalyticsDashboard } from '../extensions/FrontendExtensions';
import { ChangeView, MapControls, UnifiedMapControl, SearchControl } from '../components/MapControls';
import { HeatmapLayer } from '../components/HeatmapLayer';
import { getTileUrl } from '../lib/mapUtils';
import L from 'leaflet';
import { GoogleGenAI } from "@google/genai";

const CustomMarkerIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35]
});

const MapEvents = ({ setMapCenter }) => {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      setMapCenter([center.lat, center.lng]);
    },
    click: (e) => {
      setMapCenter([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
};

const AdminPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('monitoring');
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [liveLocations, setLiveLocations] = useState({});
  const [zones, setZones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [mapType, setMapType] = useState('roadmap');
  const [travelMode, setTravelMode] = useState('car');
  const [newZone, setNewZone] = useState({ name: '', type: 'safe', radius: 500, description: '', factors: [] });
  const [userLocation, setUserLocation] = useState(null);
  const [safePlaces, setSafePlaces] = useState([]);
  const [isFindingSafePlaces, setIsFindingSafePlaces] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGeneratingReason, setIsGeneratingReason] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleLocateAndAnalyze = async (autoCreate = false) => {
    if (!newZone.name) return;
    setIsGeocoding(true);
    setIsGeneratingReason(true);
    try {
      // 1. Geocode
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newZone.name)}`);
      const data = await resp.json();
      let coords = mapCenter;
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          coords = [lat, lon];
          setMapCenter(coords);
        } else {
          throw new Error("Invalid coordinates received from location service.");
        }
      } else {
        throw new Error("Location not found. Please try a more specific name.");
      }

      // 2. Generate Reason with AI
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the safety of this location: "${newZone.name}" at coordinates ${coords[0]}, ${coords[1]}. 
        The zone type is marked as "${newZone.type}". 
        Provide a professional safety assessment in JSON format:
        {
          "reason": "A concise 1-2 sentence summary of why this area is ${newZone.type}.",
          "factors": ["Factor 1", "Factor 2", "Factor 3"]
        }
        Consider specific factors like lighting, police presence, historical data, commercial activity, or local infrastructure.`,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const dataAI = JSON.parse(response.text);
      const reason = dataAI.reason;
      const factors = dataAI.factors || [];
      
      if (autoCreate) {
        await handleAddZone(coords, reason, factors);
      } else {
        setNewZone(prev => ({ ...prev, description: reason, factors }));
      }
    } catch (err) {
      console.error("Locate & Analyze error:", err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGeocoding(false);
      setIsGeneratingReason(false);
    }
  };

  const findSafePlaces = async (coords) => {
    const targetLocation = coords || mapCenter || userLocation;
    if (!targetLocation) return;
    
    setIsFindingSafePlaces(true);
    setSafePlaces([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am looking at latitude ${targetLocation[0]} and longitude ${targetLocation[1]}. Find 5 nearby safe places like police stations, hospitals, and 24/7 open public spaces in this specific area. Use the Google Maps tool to find them and provide their names and Google Maps links.`,
        config: {
          systemInstruction: "You are a safety assistant. Your goal is to find nearby safe locations for the user. Always use the Google Maps tool to find real, nearby places based on the provided coordinates.",
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: targetLocation[0],
                longitude: targetLocation[1]
              }
            }
          }
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        const places = chunks
          .filter((c) => c.maps)
          .map((c) => ({
            title: c.maps.title,
            uri: c.maps.uri,
            lat: c.maps.latLng?.latitude,
            lng: c.maps.latLng?.longitude
          }));
        setSafePlaces(places);
      }
    } catch (err) {
      console.error("Error finding safe places:", err);
    } finally {
      setIsFindingSafePlaces(false);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (pos.coords && typeof pos.coords.latitude === 'number' && typeof pos.coords.longitude === 'number') {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
        }
      },
      () => {
        console.log("Geolocation failed, using default.");
      }
    );
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.slice(-50)); // Limit to recent logs
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      const timer = setTimeout(fetchLogs, 1000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchLogs]);

  useEffect(() => {
    // Fetch Heatmap for monitoring/zones
    if (activeTab === 'monitoring' || activeTab === 'zones') {
      fetch('/api/heatmap')
        .then(res => res.json())
        .then(data => setHeatmapData(data));
    }
  }, [activeTab]);

  useEffect(() => {
    const socket = io();
    socket.on('location_update', (data) => {
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        setLiveLocations(prev => ({
          ...prev,
          [data.userId]: [data.lat, data.lng]
        }));
      }
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const qAlerts = query(collection(db, 'alerts'));
    const unsubscribeAlerts = onSnapshot(qAlerts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => getTimestampMillis(b.timestamp) - getTimestampMillis(a.timestamp));
      setAlerts(data);
      
      const activeAlerts = data.filter(a => a.status === 'active' || a.status === 'dispatched');
      if (activeAlerts.length > 0) {
        const newCenter = [activeAlerts[0].lat, activeAlerts[0].lng];
        setMapCenter(prev => {
          if (!prev) return newCenter;
          const dLat = Math.abs(prev[0] - newCenter[0]);
          const dLng = Math.abs(prev[1] - newCenter[1]);
          if (dLat > 0.0001 || dLng > 0.0001) return newCenter;
          return prev;
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'alerts');
    });

    const qUsers = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    const qZones = query(collection(db, 'zones'));
    const unsubscribeZones = onSnapshot(qZones, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setZones(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'zones');
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeUsers();
      unsubscribeZones();
    };
  }, []);

  const resolveAlert = async (id) => {
    try {
      await updateDoc(doc(db, 'alerts', id), {
        status: 'resolved',
        resolvedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alerts/${id}`);
    }
  };

  const dispatchHelp = async (id) => {
    try {
      await updateDoc(doc(db, 'alerts', id), {
        status: 'dispatched',
        dispatchedAt: serverTimestamp(),
        responderId: 'R-' + Math.floor(Math.random() * 1000)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alerts/${id}`);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const handleAddUser = () => {
    setEditingUser({
      name: '',
      email: '',
      phone: '',
      emergency: '',
      role: 'user',
      isNew: true
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      if (editingUser.isNew) {
        const { isNew, ...userData } = editingUser;
        if (!userData.email) throw new Error("Email is required for new users.");
        const newUserRef = doc(collection(db, 'users'));
        await setDoc(newUserRef, {
          ...userData,
          createdAt: serverTimestamp(),
          uid: newUserRef.id
        });
      } else {
        const userRef = doc(db, 'users', editingUser.id);
        const { id, ...userData } = editingUser;
        await updateDoc(userRef, userData);
      }
      setEditingUser(null);
    } catch (err) {
      handleFirestoreError(err, editingUser.isNew ? OperationType.CREATE : OperationType.UPDATE, editingUser.isNew ? 'users' : `users/${editingUser.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await deleteDoc(doc(db, 'users', deletingUser.id));
      setDeletingUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${deletingUser.id}`);
    }
  };

  const handleAddZone = async (coords = null, reason = null, factors = null) => {
    if (!newZone.name) return;
    try {
      const zoneRef = doc(collection(db, 'zones'));
      await setDoc(zoneRef, {
        ...newZone,
        description: reason || newZone.description,
        factors: factors || newZone.factors || [],
        center: coords || mapCenter,
        createdAt: Date.now(),
        id: zoneRef.id
      });
      setNewZone({ name: '', type: 'safe', radius: 500, description: '', factors: [] });
      setSuccess("Zone created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'zones');
    }
  };

  const handleDeleteZone = async (id) => {
    try {
      await deleteDoc(doc(db, 'zones', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `zones/${id}`);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1200px]">
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] bg-error/90 backdrop-blur-md text-text-primary px-6 py-3 rounded-2xl border border-error/20 shadow-2xl text-xs font-bold flex items-center gap-3"
          >
            <AlertTriangle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] bg-success/90 backdrop-blur-md text-text-primary px-6 py-3 rounded-2xl border border-success/20 shadow-2xl text-xs font-bold flex items-center gap-3"
          >
            <CheckCircle className="w-4 h-4" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-12">
        <AnalyticsDashboard alerts={alerts} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex items-center gap-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Alerts</div>
            <div className="text-2xl font-black text-text-primary">{alerts.length}</div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 flex items-center gap-5 border-error/20"
        >
          <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Active Now</div>
            <div className="text-2xl font-black text-error">{alerts.filter(a => a.status === 'active').length}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 flex items-center gap-5 border-success/20"
        >
          <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Users</div>
            <div className="text-2xl font-black text-success">{users.length}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 flex items-center gap-5 border-accent/20"
        >
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">System Health</div>
            <div className="text-2xl font-black text-text-primary">Optimal</div>
          </div>
        </motion.div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('monitoring')}
          className={`px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'monitoring' ? 'bg-primary text-dark-bg shadow-lg shadow-primary/20' : 'bg-secondary-bg/30 text-text-secondary hover:text-text-primary'}`}
        >
          Live Monitoring
        </button>
        <button 
          onClick={() => setActiveTab('alerts')}
          className={`px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'alerts' ? 'bg-primary text-dark-bg shadow-lg shadow-primary/20' : 'bg-secondary-bg/30 text-text-secondary hover:text-text-primary'}`}
        >
          SOS History
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-primary text-dark-bg shadow-lg shadow-primary/20' : 'bg-secondary-bg/30 text-text-secondary hover:text-text-primary'}`}
        >
          User Management
        </button>
        <button 
          onClick={() => setActiveTab('zones')}
          className={`px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'zones' ? 'bg-primary text-dark-bg shadow-lg shadow-primary/20' : 'bg-secondary-bg/30 text-text-secondary hover:text-text-primary'}`}
        >
          Zones
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-primary text-dark-bg shadow-lg shadow-primary/20' : 'bg-secondary-bg/30 text-text-secondary hover:text-text-primary'}`}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Total Alerts</div>
              <div className="text-3xl font-black text-text-primary">{alerts.length}</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Active Users</div>
              <div className="text-3xl font-black text-primary">{users.length}</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Safe Zones</div>
              <div className="text-3xl font-black text-success">{zones.filter(z => z.type === 'safe').length}</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Risk Areas</div>
              <div className="text-3xl font-black text-error">{zones.filter(z => z.type === 'risk').length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" /> Alerts Over Time
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={alerts.slice(0, 10).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                    <Line type="monotone" dataKey="timestamp" stroke="#FFD700" strokeWidth={3} dot={{ fill: '#FFD700' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-8 flex items-center gap-3">
                <ChartIcon className="w-5 h-5 text-accent" /> Risk Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Safe', value: zones.filter(z => z.type === 'safe').length },
                        { name: 'Risk', value: zones.filter(z => z.type === 'risk').length }
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#22C55E" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-8 flex items-center gap-3">
              <FileText className="w-5 h-5 text-text-secondary" /> System Logs
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {logs.slice().reverse().map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary-bg/30 rounded-xl border border-glass-border text-[10px]">
                  <div className="flex items-center gap-4">
                    <span className="text-text-secondary">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-bold uppercase ${log.method === 'POST' ? 'text-primary' : 'text-accent'}`}>{log.method}</span>
                    <span className="text-text-primary font-mono">{log.url}</span>
                  </div>
                  <span className="text-text-secondary opacity-50">{log.ip}</span>
                </div>
              ))}
            </div>
            {safePlaces.length > 0 && (
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Safe Areas Found</h3>
                  <button onClick={() => setSafePlaces([])} className="text-[10px] font-bold text-text-secondary hover:text-error uppercase">Clear</button>
                </div>
                <div className="space-y-3">
                  {safePlaces.map((place, i) => (
                    <a 
                      key={i}
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary-bg/30 border border-glass-border hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">{place.title}</span>
                      </div>
                      <Navigation className="w-3 h-3 text-text-secondary group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="h-[600px] rounded-[32px] overflow-hidden border border-glass-border shadow-2xl relative">
              <MapContainer 
                center={mapCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <MapEvents setMapCenter={setMapCenter} />
                <ChangeView center={mapCenter} zoom={15} />
                <MapControls onRecenter={() => setMapCenter(userLocation || [19.0760, 72.8777])} />
                <UnifiedMapControl 
                  mapType={mapType} 
                  setMapType={setMapType} 
                  travelMode={travelMode}
                  setTravelMode={setTravelMode}
                />
                <SearchControl onSelect={(coords, name) => {
                  setMapCenter(coords);
                  if (activeTab === 'zones') {
                    setNewZone(prev => ({ ...prev, name: name.split(',')[0] }));
                  }
                }} />
                
                <div className="absolute top-20 right-6 z-[1000]">
                  <button 
                    onClick={() => findSafePlaces(mapCenter)}
                    disabled={isFindingSafePlaces}
                    className="p-3 rounded-2xl bg-card-bg/80 backdrop-blur-md border border-glass-border shadow-2xl text-primary hover:bg-primary hover:text-dark-bg transition-all"
                    title="Find Safe Areas in this View"
                  >
                    <Globe className={`w-6 h-6 ${isFindingSafePlaces ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <TileLayer 
                  key={mapType}
                  url={getTileUrl(mapType)} 
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  attribution='&copy; Google Maps'
                />
                <HeatmapLayer points={heatmapData} />

                {safePlaces.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number').map((p, i) => (
                  <Marker key={`safe-mon-1-${i}`} position={[p.lat, p.lng]} icon={CustomMarkerIcon}>
                    <LeafletTooltip permanent={true} direction="top">
                      <div className="text-[10px] font-bold text-primary">{p.title}</div>
                    </LeafletTooltip>
                    <Popup>
                      <div className="p-2">
                        <div className="text-xs font-bold text-primary mb-1">{p.title}</div>
                        <a href={p.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent underline">View on Maps</a>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {alerts.filter(a => a.status !== 'resolved' && a.lat && a.lng).map(alert => (
                  <Marker 
                    key={alert.id} 
                    position={liveLocations[alert.userId] || [alert.lat, alert.lng]}
                    icon={CustomMarkerIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[150px]">
                        <div className="font-black text-sm mb-1">{alert.name}</div>
                        <div className={`text-[10px] font-bold uppercase mb-2 ${alert.status === 'active' ? 'text-error' : 'text-warning'}`}>
                          Status: {alert.status}
                        </div>
                        {liveLocations[alert.userId] && <div className="text-[9px] text-success font-bold uppercase mb-2">Live Tracking Active</div>}
                        <div className="text-[10px] text-text-secondary mb-3">
                          Time: {alert.time}
                        </div>
                        {alert.status === 'active' && (
                          <button 
                            onClick={() => dispatchHelp(alert.id)}
                            className="w-full bg-primary text-dark-bg py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                          >
                            Dispatch Help
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {zones.filter(z => z.center && z.center[0] && z.center[1]).map(z => (
                  <Circle 
                    key={z.id} 
                    center={z.center} 
                    radius={z.radius}
                    pathOptions={{ 
                      color: z.type === 'safe' ? '#22C55E' : '#EF4444',
                      fillColor: z.type === 'safe' ? '#22C55E' : '#EF4444',
                      fillOpacity: 0.2
                    }}
                  >
                    <LeafletTooltip permanent={true} direction="top">
                      <div className="text-[10px] font-bold">{z.name}</div>
                    </LeafletTooltip>
                    <Popup>
                      <div className="p-2">
                        <div className="font-black text-xs mb-1 uppercase tracking-widest">{z.name}</div>
                        <div className="text-[10px] text-text-secondary">{z.description}</div>
                      </div>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
              <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3">
                <div className="bg-dark-bg/80 backdrop-blur-md px-4 py-2 rounded-xl border border-glass-border text-[10px] font-bold text-text-primary flex items-center gap-2">
                  <div className="w-2 h-2 bg-error rounded-full animate-pulse" /> {alerts.filter(a => a.status === 'active').length} ACTIVE ALERTS
                </div>
                <div className="bg-dark-bg/80 backdrop-blur-md px-4 py-2 rounded-xl border border-glass-border text-[10px] font-bold text-text-primary flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full" /> {alerts.filter(a => a.status === 'dispatched').length} DISPATCHED
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6 h-[600px] flex flex-col">
              <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                <Activity className="text-primary w-5 h-5" /> Response Queue
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {alerts.filter(a => a.status !== 'resolved').length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                    <Shield className="w-12 h-12 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">No active emergencies</p>
                  </div>
                ) : (
                  alerts.filter(a => a.status !== 'resolved').map(alert => (
                    <div key={alert.id} className={`p-4 rounded-2xl border transition-all ${alert.status === 'active' ? 'bg-error/10 border-error/20' : 'bg-warning/10 border-warning/20'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-sm">{alert.name}</div>
                        <div className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-dark-bg/50">
                          {alert.status}
                        </div>
                      </div>
                      <div className="text-[10px] text-text-secondary mb-4 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {alert.time}
                      </div>
                      <div className="flex gap-2">
                        {alert.status === 'active' ? (
                          <button 
                            onClick={() => dispatchHelp(alert.id)}
                            className="flex-1 bg-primary text-dark-bg py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                          >
                            Dispatch
                          </button>
                        ) : (
                          <div className="flex-1 bg-secondary-bg/30 text-warning py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-warning/20">
                            Responder: {alert.responderId}
                          </div>
                        )}
                        <button 
                          onClick={() => resolveAlert(alert.id)}
                          className="flex-1 bg-success text-text-primary py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-8 h-[700px] flex flex-col relative overflow-hidden animate-float">
              <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black flex items-center gap-3 text-text-primary tracking-tight">
                  <Bell className="text-error w-6 h-6 animate-pulse" /> SOS Alerts
                </h3>
                <span className="bg-error text-text-primary text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-error/30 animate-bounce">
                  {alerts.filter(a => a.status === 'active').length}
                </span>
              </div>

              <div className="mb-8 space-y-3">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Quick Actions</div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" /> Report
                  </button>
                  <button 
                    onClick={() => setMapCenter([19.0760, 72.8777])}
                    className="bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-secondary space-y-4 opacity-40">
                    <Shield className="w-12 h-12" />
                    <p className="text-sm font-bold uppercase tracking-widest">No alerts recorded</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div 
                      key={alert.id} 
                      onClick={() => setMapCenter([alert.lat, alert.lng])}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden ${alert.status === 'active' ? 'bg-error/10 border-error/30 shadow-xl shadow-error/10' : 'bg-secondary-bg/20 border-glass-border opacity-60 hover:opacity-100'}`}
                    >
                      {alert.status === 'active' && (
                        <div className="absolute top-0 right-0 w-1 h-full bg-error shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                      )}
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-black text-sm text-text-primary tracking-tight group-hover:text-primary transition-colors">{alert.name}</div>
                        <div className="text-[10px] text-text-secondary flex flex-col items-end font-bold tracking-wider">
                          <span>{alert.time}</span>
                          {alert.status === 'resolved' && (
                            <span className="text-success flex items-center gap-1 mt-1">
                              <CheckCircle className="w-3 h-3" /> Resolved
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="text-[10px] text-text-secondary flex items-center gap-3 font-medium">
                          <PhoneCall className="w-3.5 h-3.5 text-primary/60" /> {alert.phone || 'N/A'}
                        </div>
                        <div className="text-[10px] text-text-secondary flex items-center gap-3 font-medium">
                          <Mail className="w-3.5 h-3.5 text-primary/60" /> {alert.email || 'N/A'}
                        </div>
                        <div className="text-[10px] text-text-secondary flex items-center gap-3 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary/60" /> {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                        </div>
                      </div>

                      {alert.status === 'active' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); resolveAlert(alert.id); }}
                          className="w-full bg-success hover:bg-success/90 text-text-primary text-[11px] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-success/20"
                        >
                          <CheckCircle className="w-4 h-4" /> Mark Resolved
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="h-[700px] rounded-[24px] overflow-hidden border border-primary/10 shadow-2xl relative">
              <MapContainer 
                center={mapCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <MapEvents setMapCenter={setMapCenter} />
                <ChangeView center={mapCenter} zoom={15} />
                <MapControls onRecenter={() => setMapCenter([19.0760, 72.8777])} />
                <UnifiedMapControl 
                  mapType={mapType} 
                  setMapType={setMapType} 
                  travelMode={travelMode}
                  setTravelMode={setTravelMode}
                />
                <SearchControl onSelect={(coords) => setMapCenter(coords)} />
                
                <TileLayer 
                  key={mapType}
                  url={getTileUrl(mapType)} 
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  attribution='&copy; Google Maps'
                />
                <HeatmapLayer points={heatmapData} />

                {alerts.filter(a => a.lat && a.lng).map(alert => (
                  <Marker 
                    key={alert.id} 
                    position={[alert.lat, alert.lng]}
                    icon={CustomMarkerIcon}
                  >
                    <Popup>
                      <div className="text-xs">
                        <div className="font-bold">{alert.name}</div>
                        <div className="text-error font-bold uppercase text-[10px]">{alert.status} SOS</div>
                        <div>{alert.time}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {safePlaces.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number').map((p, i) => (
                  <Marker key={`safe-mon-2-${i}`} position={[p.lat, p.lng]} icon={CustomMarkerIcon}>
                    <LeafletTooltip permanent={true} direction="top">
                      <div className="text-[10px] font-bold text-primary">{p.title}</div>
                    </LeafletTooltip>
                    <Popup>
                      <div className="p-2">
                        <div className="text-xs font-bold text-primary mb-1">{p.title}</div>
                        <a href={p.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent underline">View on Maps</a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <div className="absolute top-4 right-4 z-[1000] bg-card-bg px-4 py-2 rounded-full border border-glass-border text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-error rounded-full animate-pulse" /> LIVE MONITORING
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'zones' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="h-[600px] rounded-[32px] overflow-hidden border border-glass-border shadow-2xl relative">
              <MapContainer 
                center={mapCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <MapEvents setMapCenter={setMapCenter} />
                <ChangeView center={mapCenter} zoom={15} />
                <MapControls onRecenter={() => setMapCenter(userLocation || [19.0760, 72.8777])} />
                <UnifiedMapControl 
                  mapType={mapType} 
                  setMapType={setMapType} 
                  travelMode={travelMode}
                  setTravelMode={setTravelMode}
                />
                <SearchControl onSelect={async (coords, name) => {
                  const zoneName = name.split(',')[0];
                  setMapCenter(coords);
                  setNewZone(prev => ({ ...prev, name: zoneName }));
                  
                  // Automatically trigger AI analysis for the searched location
                  setIsGeneratingReason(true);
                  try {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    const response = await ai.models.generateContent({
                      model: "gemini-3-flash-preview",
                      contents: `Analyze the safety of this location: "${zoneName}" at coordinates ${coords[0]}, ${coords[1]}. 
                      The zone type is marked as "${newZone.type}". 
                      Provide a professional safety assessment in JSON format:
                      {
                        "reason": "A concise 1-2 sentence summary of why this area is ${newZone.type}.",
                        "factors": ["Factor 1", "Factor 2", "Factor 3"]
                      }
                      Consider specific factors like lighting, police presence, historical data, commercial activity, or local infrastructure.`,
                      config: {
                        responseMimeType: "application/json"
                      }
                    });
                    
                    const dataAI = JSON.parse(response.text);
                    setNewZone(prev => ({ 
                      ...prev, 
                      name: zoneName, 
                      description: dataAI.reason,
                      factors: dataAI.factors || []
                    }));
                  } catch (err) {
                    console.error("Auto-analysis error:", err);
                  } finally {
                    setIsGeneratingReason(false);
                  }
                }} />
                
                <div className="absolute top-20 right-6 z-[1000]">
                  <button 
                    onClick={() => findSafePlaces(mapCenter)}
                    disabled={isFindingSafePlaces}
                    className="p-3 rounded-2xl bg-card-bg/80 backdrop-blur-md border border-glass-border shadow-2xl text-primary hover:bg-primary hover:text-dark-bg transition-all"
                    title="Find Safe Areas in this View"
                  >
                    <Globe className={`w-6 h-6 ${isFindingSafePlaces ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <TileLayer 
                  key={mapType}
                  url={getTileUrl(mapType)} 
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  attribution='&copy; Google Maps'
                />
                <HeatmapLayer points={heatmapData} />

                {zones.filter(z => z.center && z.center[0] && z.center[1]).map(z => (
                  <Circle 
                    key={z.id} 
                    center={z.center} 
                    radius={z.radius}
                    pathOptions={{ 
                      color: z.type === 'safe' ? '#22C55E' : '#EF4444',
                      fillColor: z.type === 'safe' ? '#22C55E' : '#EF4444',
                      fillOpacity: 0.2
                    }}
                  >
                    <LeafletTooltip permanent={true} direction="top">
                      <div className="text-[10px] font-bold">{z.name}</div>
                    </LeafletTooltip>
                    <Popup>
                      <div className="p-2">
                        <div className="font-black text-xs mb-1 uppercase tracking-widest">{z.name}</div>
                        <div className="text-[10px] text-text-secondary mb-2">{z.description}</div>
                        {z.factors && z.factors.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[8px] font-bold text-primary uppercase tracking-widest mb-1">Key Factors:</div>
                            <div className="flex flex-wrap gap-1">
                              {z.factors.map((f, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[7px] font-medium border border-primary/20">
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <button 
                          onClick={() => handleDeleteZone(z.id)}
                          className="w-full bg-error/10 text-error py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-error hover:text-text-primary transition-all"
                        >
                          Delete Zone
                        </button>
                      </div>
                    </Popup>
                  </Circle>
                ))}

                {safePlaces.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number').map((p, i) => (
                  <Marker key={`safe-zone-${i}`} position={[p.lat, p.lng]} icon={CustomMarkerIcon}>
                    <LeafletTooltip permanent={true} direction="top">
                      <div className="text-[10px] font-bold text-primary">{p.title}</div>
                    </LeafletTooltip>
                    <Popup>
                      <div className="p-2">
                        <div className="text-xs font-bold text-primary mb-1">{p.title}</div>
                        <a href={p.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent underline">View on Maps</a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <div className="absolute top-6 left-6 z-[1000] bg-dark-bg/80 backdrop-blur-md px-4 py-2 rounded-xl border border-glass-border text-[10px] font-bold text-text-primary">
                CLICK MAP TO RECENTER & DEFINE ZONE CENTER
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="glass-card p-8">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                Add New Zone
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Zone Name</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newZone.name}
                      onChange={e => setNewZone({...newZone, name: e.target.value})}
                      className="flex-1 bg-secondary-bg/30 border border-glass-border rounded-xl px-4 py-3 text-xs text-text-primary outline-none focus:border-primary/50"
                      placeholder="e.g. Central Park Safe Zone"
                    />
                    <button
                      onClick={handleLocateAndAnalyze}
                      disabled={isGeocoding || !newZone.name}
                      className="px-4 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center justify-center"
                      title="Locate on Map & Generate AI Reason"
                    >
                      {isGeocoding ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Zone Type</label>
                  <select 
                    value={newZone.type}
                    onChange={e => setNewZone({...newZone, type: e.target.value})}
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl px-4 py-3 text-xs text-text-primary outline-none focus:border-primary/50"
                  >
                    <option value="safe">Safe Zone</option>
                    <option value="risk">High Risk Area</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Radius (meters)</label>
                  <input 
                    type="number" 
                    value={isNaN(newZone.radius) ? '' : newZone.radius}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setNewZone({...newZone, radius: isNaN(val) ? 0 : val});
                    }}
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl px-4 py-3 text-xs text-text-primary outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">AI Safety Assessment / Description</label>
                  <div className="relative">
                    <textarea 
                      value={newZone.description}
                      onChange={e => setNewZone({...newZone, description: e.target.value})}
                      className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl px-4 py-3 text-xs text-text-primary outline-none focus:border-primary/50 h-24 resize-none"
                      placeholder="Click the Sparkles icon to generate an AI assessment..."
                    />
                    {newZone.factors && newZone.factors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {newZone.factors.map((f, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-[8px] font-bold uppercase tracking-widest border border-primary/20">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    {isGeneratingReason && (
                      <div className="absolute inset-0 bg-dark-bg/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
                        <div className="flex items-center gap-2 text-primary">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">AI Analyzing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleLocateAndAnalyze(true)}
                  disabled={isGeocoding || isGeneratingReason || !newZone.name}
                  className="w-full bg-primary text-dark-bg py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isGeocoding ? 'Locating...' : isGeneratingReason ? 'Analyzing...' : 'Locate & Create Zone'}
                </button>
              </div>
            </div>
            
            <div className="glass-card p-8">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-6">Active Zones</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {zones.map(z => (
                  <div key={z.id} className="p-4 rounded-xl bg-secondary-bg/30 border border-glass-border flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${z.type === 'safe' ? 'bg-success' : 'bg-error'}`} />
                      <div>
                        <div className="text-xs font-bold text-text-primary">{z.name}</div>
                        <div className={`text-[9px] font-black uppercase mt-1 ${z.type === 'safe' ? 'text-success' : 'text-error'}`}>
                          {z.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setMapCenter(z.center);
                          findSafePlaces(z.center);
                        }}
                        className="p-2 bg-primary/10 rounded-lg text-primary hover:bg-primary hover:text-dark-bg transition-all opacity-0 group-hover:opacity-100"
                        title="Find Safe Areas in this Zone"
                      >
                        <Navigation className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteZone(z.id)}
                        className="p-2 text-text-secondary hover:text-error transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8">
          <div className="glass-card overflow-hidden shadow-2xl relative z-10">
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
            <div className="p-8 border-b border-glass-border flex items-center justify-between">
              <h3 className="text-2xl font-black flex items-center gap-4 text-text-primary tracking-tight">
                <User className="text-primary w-7 h-7" /> Registered Users
              </h3>
              <div className="flex items-center gap-6">
                <button 
                  onClick={handleAddUser}
                  className="bg-primary hover:bg-primary/90 text-dark-bg px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Add User
                </button>
                <div className="text-text-secondary text-sm font-bold uppercase tracking-widest">
                  {users.length} Total Users
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary-bg/20 text-[11px] uppercase tracking-[0.2em] font-bold text-text-secondary">
                    <th className="px-10 py-5">User Profile</th>
                    <th className="px-10 py-5">Contact Info</th>
                    <th className="px-10 py-5">Emergency Contact</th>
                    <th className="px-10 py-5">Role</th>
                    <th className="px-10 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/50">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-secondary-bg/10 transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-text-primary tracking-tight">{user.name}</div>
                            <div className="text-[10px] text-text-secondary mt-1 font-medium tracking-wide">ID: {user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-text-primary tracking-tight">{user.email}</div>
                          <div className="text-[10px] text-text-secondary flex items-center gap-2 font-medium">
                            <PhoneCall className="w-3 h-3" /> {user.phone || 'Not provided'}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="text-sm font-bold text-error tracking-tight">
                          {user.emergency || 'Not provided'}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] border ${user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary-bg/30 text-text-secondary border-glass-border'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-3 bg-secondary-bg/30 hover:bg-primary/10 text-text-secondary hover:text-primary rounded-xl transition-all border border-glass-border hover:border-primary/20"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingUser(user)}
                            className="p-3 bg-secondary-bg/30 hover:bg-error/10 text-text-secondary hover:text-error rounded-xl transition-all border border-glass-border hover:border-error/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-dark-bg/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 relative z-10 overflow-hidden"
            >
              <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-2xl">
                    {editingUser.isNew ? <UserPlus className="text-primary w-6 h-6" /> : <Settings className="text-primary w-6 h-6" />}
                  </div>
                  {editingUser.isNew ? 'Add New User' : 'Edit User Profile'}
                </h3>
                <button onClick={() => setEditingUser(null)} className="p-3 hover:bg-secondary-bg/50 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-6">
                {editingUser.isNew && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Email Address</label>
                    <input 
                      type="email"
                      className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                      value={editingUser.email}
                      onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <input 
                    type="text"
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                    value={editingUser.name}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Phone Number</label>
                  <input 
                    type="text"
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                    value={editingUser.phone || ''}
                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Emergency Contact</label>
                  <input 
                    type="text"
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                    value={editingUser.emergency || ''}
                    onChange={e => setEditingUser({ ...editingUser, emergency: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">User Role</label>
                  <select 
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all appearance-none"
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    onClick={() => setEditingUser(null)}
                    className="flex-1 bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-4.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.15em] text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveUser}
                    disabled={isSaving}
                    className="flex-[2] neon-button text-text-primary p-4.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.15em] shadow-lg shadow-primary/20"
                  >
                    {isSaving ? 'Saving...' : (editingUser.isNew ? 'Create User' : 'Save Profile')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingUser(null)}
              className="absolute inset-0 bg-dark-bg/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-md p-10 relative z-10 overflow-hidden text-center"
            >
              <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
              <div className="w-20 h-20 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertTriangle className="text-error w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-4">Delete User?</h3>
              <p className="text-text-secondary text-sm mb-10 font-medium">
                Are you sure you want to delete <span className="text-text-primary font-bold">{deletingUser.name}</span>? This action cannot be undone and all associated data will be lost.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-4.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.15em] text-text-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  className="flex-1 bg-error hover:bg-error/90 text-text-primary p-4.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.15em] shadow-lg shadow-error/20"
                >
                  Delete User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
