import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Shield, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Navigation, 
  Globe, 
  ExternalLink, 
  Mic, 
  Share2, 
  Car, 
  Bike, 
  Bus, 
  Accessibility as Walking,
  ChevronRight,
  Copy,
  Twitter,
  Facebook,
  Activity,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, FeatureGroup, Circle, CircleMarker, Tooltip } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import polyline from 'polyline';
import { io } from 'socket.io-client';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { db } from '../firebase';
import { handleFirestoreError, OperationType, getTimestampMillis } from '../lib/utils';
import { createModeIcon, getTileUrl } from '../lib/mapUtils';
import { 
  VoiceSOS, 
  FallDetection, 
  AnalyticsDashboard, 
  AISafetyAssistant, 
  BatterySOS,
  SMSBackup,
  RouteReviewModal
} from '../extensions/FrontendExtensions';
import { ChangeView, MapControls, UnifiedMapControl, SearchControl } from '../components/MapControls';
import { useIntelligentSOS } from '../hooks/useIntelligentSOS';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { HeatmapLayer } from '../components/HeatmapLayer';
import { Battery, MessageSquare, Star } from 'lucide-react';

const CustomMarkerIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35]
});

const DashboardPage = ({ user }) => {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [startAddr, setStartAddr] = useState('');
  const [endAddr, setEndAddr] = useState('');
  const [route, setRoute] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [sosStatus, setSosStatus] = useState('idle');
  const [isSearching, setIsSearching] = useState(false);
  const [safePlaces, setSafePlaces] = useState([]);
  const [zones, setZones] = useState([]);
  const [isFindingSafePlaces, setIsFindingSafePlaces] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [allAlerts, setAllAlerts] = useState([]);
  const [mapType, setMapType] = useState('roadmap');
  const [travelMode, setTravelMode] = useState('car');
  const [customMarkers, setCustomMarkers] = useState([]);
  const [drawnItems, setDrawnItems] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [lastCompletedRoute, setLastCompletedRoute] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [safetyScore, setSafetyScore] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ type: 'Harassment', description: '' });

  const socket = useRef(null);

  // Intelligent SOS Hook
  const { batteryLevel } = useIntelligentSOS(user, location, (reason) => {
    if (sosStatus === 'idle') {
      handleSOS(reason);
    }
  });

  useEffect(() => {
    socket.current = io();
    fetch('/api/heatmap')
      .then(res => res.json())
      .then(data => setHeatmapData(data));

    const q = query(collection(db, 'zones'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setZones(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'zones');
    });

    return () => {
      socket.current.disconnect();
      unsubscribe();
    };
  }, []);

  const handlePlaceSelect = (coords, name) => {
    setMapCenter(coords);
    const newMarker = {
      id: Date.now(),
      position: coords,
      title: name,
      description: 'Selected from search',
      image: `https://picsum.photos/seed/${name}/400/300`
    };
    setCustomMarkers(prev => [...prev, newMarker]);
  };

  const onCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === 'marker') {
      const { lat, lng } = layer.getLatLng();
      const newMarker = {
        id: Date.now(),
        position: [lat, lng],
        title: 'New Point',
        description: 'Added via drawing tool',
        image: `https://picsum.photos/seed/${Date.now()}/400/300`
      };
      setCustomMarkers(prev => [...prev, newMarker]);
    }
    setDrawnItems(prev => [...prev, layer]);
  };

  useEffect(() => {
    if (user && user.id) {
      const q = query(
        collection(db, 'alerts'),
        where('userId', '==', user.id)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllAlerts(alerts);
        const active = alerts.find(a => a.status === 'active');
        setActiveAlert(active || null);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'alerts');
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user && user.id) {
      const q = query(
        collection(db, 'routes'),
        where('userId', '==', user.id)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const routes = snapshot.docs.map(doc => {
          const data = doc.data();
          let decodedRoute = data.route;
          try {
            if (typeof data.route === 'string') {
              if (data.route.startsWith('[') || data.route.startsWith('{')) {
                decodedRoute = JSON.parse(data.route);
              } else {
                decodedRoute = polyline.decode(data.route);
              }
            }
          } catch (e) {
            console.error("Error decoding route:", e);
          }
          return { 
            id: doc.id, 
            ...data, 
            route: decodedRoute
          };
        });
        routes.sort((a, b) => {
          return getTimestampMillis(b.timestamp) - getTimestampMillis(a.timestamp);
        });
        setRouteHistory(routes);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'routes');
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        if (command.includes('help') || command.includes('sos')) {
          triggerSOS();
        }
      };

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      if (isListening) recognition.start();
      return () => recognition.stop();
    }
  }, [isListening]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (pos.coords && typeof pos.coords.latitude === 'number' && typeof pos.coords.longitude === 'number') {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setLocation(coords);
          setMapCenter(prev => {
            if (!prev) return coords;
            const dLat = Math.abs(prev[0] - coords[0]);
            const dLng = Math.abs(prev[1] - coords[1]);
            if (dLat > 0.0001 || dLng > 0.0001) return coords;
            return prev;
          });
        }
      },
      () => {
        const coords = [19.0760, 72.8777];
        setLocation(coords);
        setMapCenter(coords);
      }
    );
  }, [user, navigate]);

  const saveRouteToHistory = async (info, routeCoords) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'routes'), {
        userId: String(user.id),
        startAddr: String(startAddr || ''),
        endAddr: String(endAddr || ''),
        distance: String(info.distance || ''),
        duration: String(info.duration || ''),
        safetyScore: Number(info.safetyScore || 0),
        route: polyline.encode(routeCoords),
        timestamp: serverTimestamp(),
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'routes');
    }
  };

  const geocode = async (address) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();
      if (data && data[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  };

  const handleSearch = async () => {
    if (!startAddr || !endAddr) return;
    setIsSearching(true);
    const startCoords = await geocode(startAddr);
    const endCoords = await geocode(endAddr);
    
    if (startCoords && endCoords) {
      setStart(startCoords);
      setEnd(endCoords);
      setMapCenter(startCoords);
      calculateRoute(startCoords, endCoords);
    } else {
      setError("Could not find one or both locations. Please try a more specific address.");
    }
    setIsSearching(false);
  };

  const calculateRoute = async (s, e) => {
    try {
      let profile = 'driving';
      if (travelMode === 'walk') profile = 'walking';
      if (travelMode === 'bike') profile = 'cycling';
      
      const res = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${s[1]},${s[0]};${e[1]},${e[0]}?overview=full&geometries=geojson&alternatives=true`);
      if (!res.ok) throw new Error('Route calculation failed');
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const scoredRoutes = data.routes.map((r, index) => {
          const dist = r.distance / 1000;
          const dur = r.duration / 60;
          const safetyFactor = 85 + (Math.random() * 15); 
          const safetyScore = (safetyFactor - dist * 0.2).toFixed(1);
          
          return {
            coords: r.geometry.coordinates.map((c) => [c[1], c[0]]),
            distance: dist.toFixed(2),
            duration: Math.round(dur),
            safetyScore,
            index
          };
        });

        scoredRoutes.sort((a, b) => parseFloat(b.safetyScore) - parseFloat(a.safetyScore));
        
        const bestRoute = scoredRoutes[0];
        setRoute(bestRoute.coords);
        const info = {
          distance: bestRoute.distance,
          duration: bestRoute.duration,
          safetyScore: bestRoute.safetyScore
        };
        setRouteInfo(info);
        saveRouteToHistory(info, bestRoute.coords);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExitNavigation = () => {
    if (route.length > 0) {
      setLastCompletedRoute({
        startAddr,
        endAddr,
        timestamp: Date.now()
      });
      setShowReviewModal(true);
    }
    setRoute([]);
    setStart(null);
    setEnd(null);
    setStartAddr('');
    setEndAddr('');
    setRouteInfo(null);
  };

  const handleReviewSubmit = async (review) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        userId: String(user.id),
        routeId: lastCompletedRoute?.id || 'manual-exit',
        rating: review.rating,
        comment: review.comment,
        timestamp: serverTimestamp(),
        startAddr: lastCompletedRoute?.startAddr,
        endAddr: lastCompletedRoute?.endAddr
      });
      setSuccess('Thank you for your feedback!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
    }
  };

  const handleSOS = async (reason) => {
    console.log("Handling SOS:", reason);
    await triggerSOS();
    if (user?.id) {
      navigate(`/track/${user.id}`);
    }
  };

  const triggerSOS = async () => {
    if (!user || !location) {
      setError(!location ? "Waiting for GPS location..." : "User not authenticated");
      return;
    }
    setSosStatus('sending');
    try {
      const alertData = {
        userId: user.id,
        name: user.name,
        phone: user.phone || 'N/A',
        email: user.email || 'N/A',
        photoURL: user.photoURL || '',
        lat: location[0],
        lng: location[1],
        status: 'active',
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString()
      };

      let docRef;
      try {
        docRef = await addDoc(collection(db, 'alerts'), alertData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'alerts');
      }
      
      if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              await updateDoc(doc(db, 'alerts', docRef.id), {
                lat: latitude,
                lng: longitude,
                timestamp: Date.now()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `alerts/${docRef.id}`);
            }
          },
          (err) => console.error("WatchPosition error:", err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
        setWatchId(id);
      }

      setSosStatus('sent');
      setTimeout(() => setSosStatus('idle'), 5000);
      
      if (user.emergency) {
        trigger112();
      } else {
        console.warn("No emergency contact found for user.");
      }
    } catch (err) {
      console.error("SOS error:", err);
      setSosStatus('idle');
      setError("Failed to send SOS. Please call emergency services directly.");
    }
  };

  const resolveMyAlert = async () => {
    if (!activeAlert) return;
    try {
      await updateDoc(doc(db, 'alerts', activeAlert.id), {
        status: 'resolved',
        resolvedAt: Date.now()
      });
      stopSOS();
      setSuccess("SOS Alert resolved successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alerts/${activeAlert.id}`);
    }
  };

  const stopSOS = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  const findSafePlaces = async (coords) => {
    const targetLocation = coords || mapCenter || location;
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
            uri: c.maps.uri
          }));
        
        if (places.length > 0) {
          setSafePlaces(places);
        } else {
          throw new Error("No safe places found in grounding metadata");
        }
      } else {
        throw new Error("No grounding chunks returned");
      }
    } catch (err) {
      console.error("AI safe places error:", err);
      setError("We encountered an issue finding safe places using AI. Please use the map to find nearby locations.");
    }
    setIsFindingSafePlaces(false);
  };

  const trigger112 = () => {
    if (!location) return;
    const message = `EMERGENCY SOS: I am at https://www.google.com/maps?q=${location[0]},${location[1]}. Please help! - Sent via SafeWalk`;
    const whatsappUrl = `https://wa.me/${user.emergency.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareRoute = (startName, endName, score) => {
    const text = `I just found a safe route from ${startName} to ${endName} with a ${score}% safety score using SafeWalk! 🛡️🚶‍♂️`;
    const url = window.location.origin;
    
    return {
      copy: () => {
        navigator.clipboard.writeText(`${text} Check it out: ${url}`);
        setSuccess("Link copied to clipboard!");
        setTimeout(() => setSuccess(null), 3000);
      },
      twitter: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
      },
      facebook: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
      }
    };
  };

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1400px]">
      <VoiceSOS onTrigger={() => handleSOS("Voice SOS")} />
      <FallDetection onTrigger={() => handleSOS("Fall Detected")} />

      <div className="mb-10">
        <AnalyticsDashboard alerts={allAlerts} />
      </div>

      <div className="mb-10">
        <AISafetyAssistant routes={routeHistory} alerts={allAlerts} />
      </div>

      <AnimatePresence>
        {showFakeCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-dark-bg flex flex-col items-center justify-between py-24 px-10"
          >
            <div className="particle-bg opacity-20" />
            <div className="text-center space-y-6 animate-float">
              <div className="w-32 h-32 bg-secondary-bg/50 rounded-full mx-auto flex items-center justify-center border border-glass-border shadow-[0_0_50px_rgba(255,255,255,0.1)] relative">
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                <User className="w-16 h-16 text-text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-bold text-text-primary tracking-tight">Mom</h2>
                <p className="text-primary font-bold tracking-[0.3em] uppercase text-xs animate-pulse">Incoming Call...</p>
              </div>
            </div>

            <div className="flex gap-16 md:gap-32">
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => setShowFakeCall(false)}
                  className="w-20 h-20 bg-error rounded-full flex items-center justify-center shadow-[0_0_30px_var(--color-error)] hover:scale-110 transition-transform active:scale-90"
                >
                  <PhoneCall className="w-10 h-10 text-text-primary rotate-[135deg]" />
                </button>
                <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => setShowFakeCall(false)}
                  className="w-20 h-20 bg-success rounded-full flex items-center justify-center shadow-[0_0_30px_var(--color-success)] hover:scale-110 transition-transform active:scale-90"
                >
                  <PhoneCall className="w-10 h-10 text-text-primary" />
                </button>
                <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Accept</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 bg-error/10 border border-error/20 text-error p-5 rounded-2xl text-sm flex items-center gap-4 shadow-xl shadow-error/5"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError(null)} className="p-2 hover:bg-error/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 bg-success/10 border border-success/20 text-success p-5 rounded-2xl text-sm flex items-center gap-4 shadow-xl shadow-success/5"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 font-medium">{success}</span>
            <button onClick={() => setSuccess(null)} className="p-2 hover:bg-success/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-card p-8 relative overflow-hidden animate-float">
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[24px]" />
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg"><Navigation className="text-primary w-5 h-5" /></div>
              Route Intelligence
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Origin</label>
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Search starting point..."
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-primary/20"
                    value={startAddr}
                    onChange={e => setStartAddr(e.target.value)}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-text-primary/20 group-focus-within:text-primary transition-colors">
                    <MapPin className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Destination</label>
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Search destination..."
                    className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-primary/20"
                    value={endAddr}
                    onChange={e => setEndAddr(e.target.value)}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-text-primary/20 group-focus-within:text-error transition-colors">
                    <MapPin className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setStart(null); setEnd(null); setRoute([]); setRouteInfo(null); setStartAddr(''); setEndAddr(''); }}
                  className="flex-1 bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-4.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.15em] text-text-secondary hover:text-text-primary"
                >
                  Clear
                </button>
                <button 
                  onClick={handleSearch}
                  disabled={!startAddr || !endAddr || isSearching}
                  className="flex-[2] neon-button text-text-primary p-4.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.15em] disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isSearching ? 'Analyzing...' : 'Find Route'}
                </button>
              </div>
            </div>

            {routeInfo && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 pt-8 border-t border-glass-border space-y-6"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-2xl bg-secondary-bg/20 border border-glass-border/50">
                    <div className="text-xl font-bold text-primary">{isNaN(routeInfo.distance) ? '0' : routeInfo.distance}</div>
                    <div className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Distance (KM)</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-secondary-bg/20 border border-glass-border/50">
                    <div className="text-xl font-bold">{isNaN(routeInfo.duration) ? '0' : routeInfo.duration}</div>
                    <div className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Time (MIN)</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-secondary-bg/20 border border-glass-border/50">
                    <div className="text-xl font-bold text-success">{isNaN(routeInfo.safetyScore) ? '0' : routeInfo.safetyScore}%</div>
                    <div className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Safety Index</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => shareRoute(startAddr, endAddr, routeInfo.safetyScore).copy()}
                    className="flex-1 bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => shareRoute(startAddr, endAddr, routeInfo.safetyScore).twitter()}
                      className="w-10 h-10 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-primary flex items-center justify-center transition-all"
                    >
                      <Twitter className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => shareRoute(startAddr, endAddr, routeInfo.safetyScore).facebook()}
                      className="w-10 h-10 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl text-accent flex items-center justify-center transition-all"
                    >
                      <Facebook className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative group">
              <div className={`absolute -inset-8 rounded-full blur-3xl transition-all duration-700 ${activeAlert ? 'bg-error/30 animate-pulse' : 'bg-primary/10 group-hover:bg-primary/20'}`} />
              <button 
                onClick={activeAlert ? resolveMyAlert : () => handleSOS("Manual SOS")}
                disabled={sosStatus === 'sending'}
                className={`z-10 ${activeAlert ? 'sos-button-active' : 'sos-button-pulse'}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Shield className={`w-12 h-12 ${activeAlert ? 'text-error animate-pulse' : 'text-text-primary'}`} />
                  <span className={`text-2xl font-black tracking-[0.3em] ${activeAlert ? 'text-error' : 'text-text-primary'}`}>
                    {activeAlert ? 'ACTIVE' : (
                      sosStatus === 'idle' ? 'SOS' :
                      sosStatus === 'sending' ? '...' :
                      'SENT'
                    )}
                  </span>
                </div>
              </button>
            </div>
            {activeAlert && (
              <p className="mt-8 text-[11px] font-bold text-error uppercase tracking-[0.2em] animate-pulse">
                Emergency Alert is Active. Tap to Resolve.
              </p>
            )}
            {!activeAlert && (
              <p className="mt-12 text-[11px] font-bold text-text-secondary uppercase tracking-[0.4em] text-center max-w-[240px] leading-loose">
                Hold for 3 seconds to trigger emergency alert
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <button 
                onClick={() => findSafePlaces(mapCenter)}
                disabled={isFindingSafePlaces}
                className="w-full glass-card p-8 flex flex-col items-center gap-4 group hover:border-primary/30 transition-all"
              >
                <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                  <Globe className={`w-7 h-7 text-primary ${isFindingSafePlaces ? 'animate-spin' : ''}`} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary group-hover:text-text-primary transition-colors text-center">
                  {isFindingSafePlaces ? 'Locating...' : 'Safe Zones'}
                </span>
              </button>
              
              <AnimatePresence>
                {safePlaces.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-3"
                  >
                    {safePlaces.map((place, i) => (
                      <motion.a
                        key={i}
                        href={place.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary-bg/30 border border-glass-border hover:bg-secondary-bg/50 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors">{place.title}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-text-primary/20 group-hover:text-primary transition-colors" />
                      </motion.a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => setShowFakeCall(true)}
                className="w-full glass-card p-8 flex flex-col items-center gap-4 group hover:border-primary/30 h-fit"
              >
                <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                  <PhoneCall className="w-7 h-7 text-primary" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary group-hover:text-text-primary transition-colors text-center">
                  Fake Call
                </span>
              </button>

              {zones.length > 0 && (
                <div className="glass-card p-6 border-glass-border">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-4">Nearby Zones</div>
                  <div className="space-y-3">
                    {zones.map(z => (
                      <div key={z.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary-bg/30 border border-glass-border group">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${z.type === 'safe' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                          <div>
                            <div className="text-[10px] font-bold text-text-primary">{z.name}</div>
                            <div className="text-[8px] text-text-secondary uppercase tracking-widest mb-1">{z.type} Zone</div>
                            {z.factors && z.factors.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {z.factors.slice(0, 2).map((f, idx) => (
                                  <span key={idx} className="px-1 py-0.5 bg-primary/5 text-primary/70 rounded text-[6px] font-medium border border-primary/10">
                                    {f}
                                  </span>
                                ))}
                                {z.factors.length > 2 && <span className="text-[6px] text-text-secondary">+{z.factors.length - 2} more</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setMapCenter(z.center);
                            findSafePlaces(z.center);
                          }}
                          className="p-2 bg-primary/10 rounded-lg text-primary hover:bg-primary hover:text-dark-bg transition-all opacity-0 group-hover:opacity-100"
                          title="Find Safe Areas in this Zone"
                        >
                          <Globe className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-8 flex items-center justify-between group hover:border-warning/30">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl transition-all duration-500 ${isListening ? 'bg-warning shadow-2xl' : 'bg-warning/10'}`}>
                <Mic className={`w-7 h-7 ${isListening ? 'text-text-primary' : 'text-warning'}`} />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em]">Voice SOS</div>
                <div className="text-[10px] text-text-secondary mt-1">Say "HELP" to trigger</div>
              </div>
            </div>
            <button 
              onClick={() => setIsListening(!isListening)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${isListening ? 'bg-warning text-text-primary shadow-lg' : 'bg-secondary-bg/30 text-text-secondary hover:bg-secondary-bg/50'}`}
            >
              {isListening ? 'Active' : 'Enable'}
            </button>
          </div>

          <button 
            onClick={trigger112}
            className="w-full glass-card p-8 flex items-center justify-center gap-5 group hover:border-error/30 border-error/15 bg-error/5"
          >
            <Share2 className="w-7 h-7 text-error group-hover:scale-105 transition-transform" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-error">Emergency WhatsApp</span>
          </button>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="h-[700px] glass-card overflow-hidden relative group">
            <div className="absolute inset-0 shimmer opacity-10 pointer-events-none" />
            {mapCenter ? (
              <MapContainer 
                center={mapCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <ChangeView center={mapCenter} />
                <MapControls onRecenter={() => location && setMapCenter(location)} />
                <UnifiedMapControl 
                  mapType={mapType} 
                  setMapType={setMapType} 
                  travelMode={travelMode}
                  setTravelMode={setTravelMode}
                />
                <SearchControl onSelect={handlePlaceSelect} />
                
                <TileLayer 
                  key={mapType}
                  url={getTileUrl(mapType)} 
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  attribution='&copy; Google Maps'
                />
                <HeatmapLayer points={heatmapData} />

                <FeatureGroup>
                  <EditControl
                    position="topleft"
                    onCreated={onCreated}
                    draw={{
                      rectangle: true,
                      polyline: true,
                      circle: true,
                      circlemarker: false,
                      marker: true,
                      polygon: true,
                    }}
                  />
                </FeatureGroup>

                {location && typeof location[0] === 'number' && typeof location[1] === 'number' && (
                  <Marker position={location}>
                    <Popup>
                      <div className="p-2 text-center">
                        <div className="text-xs font-bold mb-1">Your Location</div>
                        <div className="text-[10px] text-text-secondary">Last updated: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {customMarkers.filter(m => m.position && m.position[0] && m.position[1]).map(m => (
                  <Marker key={m.id} position={m.position} icon={CustomMarkerIcon}>
                    <Popup>
                      <div className="p-2 max-w-[200px]">
                        {m.image && <img src={m.image} alt={m.title} className="w-full h-24 object-cover rounded-lg mb-2" />}
                        <div className="text-xs font-bold text-text-primary mb-1">{m.title}</div>
                        <div className="text-[10px] text-text-secondary leading-relaxed">{m.description}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {safePlaces.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number').map((p, i) => (
                  <Marker key={`safe-${i}`} position={[p.lat, p.lng]} icon={CustomMarkerIcon}>
                    <Tooltip permanent={true} direction="top">
                      <div className="text-[10px] font-bold text-primary">{p.title}</div>
                    </Tooltip>
                    <Popup>
                      <div className="p-2">
                        <div className="text-xs font-bold text-primary mb-1">{p.title}</div>
                        <a href={p.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent underline">View on Maps</a>
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
                    <Popup>
                      <div className="p-2">
                        <div className="text-xs font-bold mb-1 uppercase tracking-widest">{z.name}</div>
                        <div className="text-[10px] text-text-secondary">{z.description}</div>
                        <div className={`text-[9px] font-black mt-2 uppercase ${z.type === 'safe' ? 'text-success' : 'text-error'}`}>
                          {z.type === 'safe' ? 'Safe Zone' : 'High Risk Area'}
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                ))}

                {start && <Marker position={start}><Popup>Start</Popup></Marker>}
                {end && (
                  <Marker position={end} icon={createModeIcon(travelMode)}>
                    <Popup>
                      <div className="p-2 text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Destination</div>
                        {routeInfo && (
                          <div className="text-[10px] font-black text-text-primary">
                            {(routeInfo && !isNaN(routeInfo.distance)) ? routeInfo.distance : '0'} km away
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
                {route.length > 0 && <Polyline positions={route} color="#EF4444" weight={6} opacity={0.8} />}
              </MapContainer>
            ) : (
              <div className="h-full w-full bg-dark-bg flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Initializing Neural Map...</div>
              </div>
            )}
            
            <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-4">
              <div className="glass-card px-5 py-3 flex items-center gap-3 border-glass-border/80">
                <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live GPS Active</span>
              </div>
              {isListening && (
                <div className="glass-card px-5 py-3 flex items-center gap-3 border-warning/30 bg-warning/[0.05]">
                  <div className="flex gap-0.5 items-center h-3">
                    <div className="w-0.5 h-full bg-warning animate-[bounce_1s_infinite]" />
                    <div className="w-0.5 h-2/3 bg-warning animate-[bounce_1.2s_infinite]" />
                    <div className="w-0.5 h-1/2 bg-warning animate-[bounce_0.8s_infinite]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-warning">Voice Recognition On</span>
                </div>
              )}
              {route.length > 0 && (
                <button 
                  onClick={handleExitNavigation}
                  className="glass-card px-5 py-3 flex items-center gap-3 border-error/30 bg-error/[0.05] hover:bg-error/10 transition-all group"
                >
                  <X className="w-4 h-4 text-error group-hover:rotate-90 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-error">Exit Navigation</span>
                </button>
              )}
              {routeInfo && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card px-6 py-4 border-primary/30 bg-primary/5 flex items-center gap-4"
                >
                  <div className="p-2 bg-primary/20 rounded-lg">
                    {travelMode === 'car' && <Car className="w-5 h-5 text-primary" />}
                    {travelMode === 'bike' && <Bike className="w-5 h-5 text-primary" />}
                    {travelMode === 'bus' && <Bus className="w-5 h-5 text-primary" />}
                    {travelMode === 'walk' && <Walking className="w-5 h-5 text-primary" />}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Distance to Destination</div>
                    <div className="text-xl font-black text-primary">{(routeInfo && !isNaN(routeInfo.distance)) ? routeInfo.distance : '0'} <span className="text-xs">km</span></div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-3">
              <BatterySOS onTrigger={() => handleSOS("Low Battery SOS")} />
              <SMSBackup emergencyContact={user?.emergency} location={location} />
            </div>
          </div>

          <RouteReviewModal 
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            onSubmit={handleReviewSubmit}
            routeData={lastCompletedRoute}
          />

          <div className="glass-card p-8 relative overflow-hidden animate-float">
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[24px]" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Activity className="text-primary w-5 h-5" /></div>
                Recent Activity
              </h3>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Last 30 Days</div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {routeHistory.length === 0 ? (
                <div className="col-span-2 text-center py-12 glass-card bg-secondary-bg/10">
                  <div className="text-text-primary/20 mb-4 flex justify-center"><Navigation className="w-12 h-12" /></div>
                  <div className="text-sm font-bold text-text-secondary uppercase tracking-widest">No neural data available</div>
                </div>
              ) : (
                routeHistory.map((h) => (
                  <div 
                    key={h.id}
                    onClick={() => {
                      setStartAddr(h.startAddr);
                      setEndAddr(h.endAddr);
                      setRoute(h.route);
                      if (h.route && h.route.length > 0) setMapCenter(h.route[0]);
                      setRouteInfo({
                        distance: h.distance,
                        duration: h.duration,
                        safetyScore: h.safetyScore
                      });
                    }}
                    className="glass-card p-5 group cursor-pointer hover:border-primary/30 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="px-3 py-1 bg-secondary-bg/30 rounded-full text-[9px] font-bold text-primary uppercase tracking-widest border border-glass-border/50">{h.time}</div>
                      <div className="text-[10px] font-black text-success tracking-widest uppercase">{isNaN(h.safetyScore) ? '0' : h.safetyScore}% Safe</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <div className="text-xs font-medium truncate text-text-primary/80">{h.startAddr}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-text-primary/20" />
                        <div className="text-xs font-medium truncate text-text-primary/80">{h.endAddr}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <VoiceAssistant onCommand={(type) => {
        if (type === "SOS") handleSOS("Voice Activated SOS");
        if (type === "REPORT") setShowReportModal(true);
      }} />

      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-secondary-bg border border-glass-border rounded-[40px] p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Report Unsafe Area</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Issue Type</label>
                  <select 
                    value={reportData.type}
                    onChange={(e) => setReportData({...reportData, type: e.target.value})}
                    className="w-full bg-dark-bg border border-glass-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary/50"
                  >
                    <option>Harassment</option>
                    <option>Poor Lighting</option>
                    <option>Suspicious Activity</option>
                    <option>Theft/Robbery</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Description</label>
                  <textarea 
                    value={reportData.description}
                    onChange={(e) => setReportData({...reportData, description: e.target.value})}
                    className="w-full bg-dark-bg border border-glass-border rounded-xl px-4 py-3 text-xs outline-none focus:border-primary/50 h-32 resize-none"
                    placeholder="Provide more details..."
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!location) return;
                    await fetch('/api/reports', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({ lat: location[0], lng: location[1], ...reportData })
                    });
                    setShowReportModal(false);
                    fetch('/api/heatmap').then(res => res.json()).then(data => setHeatmapData(data));
                  }}
                  className="w-full bg-primary text-dark-bg py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
