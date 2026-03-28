/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  MapPin, 
  Bell, 
  Activity, 
  LayoutDashboard, 
  Lock, 
  Zap, 
  Menu, 
  X, 
  ChevronRight, 
  PhoneCall, 
  Github, 
  ExternalLink,
  Navigation,
  LogOut,
  User,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Share2,
  Twitter,
  Facebook,
  Plus,
  Minus,
  Locate,
  Settings,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Mic,
  FileText,
  Camera,
  Upload,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { GoogleGenAI } from "@google/genai";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  orderBy, 
  limit,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { db, auth, storage } from './firebase';
import api from './lib/api';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- Socket Initialization ---
const socket = io();

// --- Firestore Error Handling ---
const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

const handleFirestoreError = (error, operationType, path, firebaseUser = null) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isOffline = errorMessage.toLowerCase().includes('offline');
  const isPermissionDenied = errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('insufficient');
  
  const currentUser = firebaseUser || auth.currentUser;
  
  const errInfo = {
    error: isOffline 
      ? `${errorMessage}. This often means the Firestore database has not been created in your Firebase project or the Firestore API is not enabled.` 
      : isPermissionDenied
        ? `${errorMessage}. This means your Firestore Security Rules are blocking this request. Please update your rules in the Firebase Console.`
        : errorMessage,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  if (isOffline) {
    console.error('Firestore Connection Error: It seems Firestore is not reachable. Please ensure you have created a Firestore database in the Firebase Console (https://console.firebase.google.com/) for project "safe-walk-f2a2c".');
  } else if (isPermissionDenied) {
    console.error('Firestore Permission Error: Your Firestore Security Rules are blocking this request. Please update your rules in the Firebase Console (https://console.firebase.google.com/project/safe-walk-f2a2c/firestore/rules).');
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

// --- Components ---

const MapControls = ({ onRecenter }) => {
  const map = useMap();
  
  return (
    <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
      <button 
        onClick={() => map.zoomIn()}
        className="w-10 h-10 bg-card-bg border border-primary/20 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-dark-bg transition-all shadow-lg"
        title="Zoom In"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button 
        onClick={() => map.zoomOut()}
        className="w-10 h-10 bg-card-bg border border-primary/20 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-dark-bg transition-all shadow-lg"
        title="Zoom Out"
      >
        <Minus className="w-5 h-5" />
      </button>
      <button 
        onClick={onRecenter}
        className="w-10 h-10 bg-card-bg border border-primary/20 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-dark-bg transition-all shadow-lg"
        title="Recenter on Me"
      >
        <Locate className="w-5 h-5" />
      </button>
    </div>
  );
};

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
};

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 h-20 bg-dark-bg border-b border-glass-border">
      <div className="container mx-auto px-6 h-full flex items-center justify-between max-w-[1200px]">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-11 h-11 bg-primary/15 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300 border border-primary/20">
            <Shield className="text-primary w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-text-primary">SafeWalk</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10 text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em]">
          <Link to="/#features" className="hover:text-primary transition-all duration-250">Features</Link>
          <Link to="/dashboard" className="hover:text-primary transition-all duration-250">Dashboard</Link>
          <Link to="/admin" className="hover:text-primary transition-all duration-250">Admin</Link>
          {user && <Link to={`/track/${user.id}`} className="hover:text-primary transition-all duration-250">Live Track</Link>}
        </div>

        <div className="hidden md:flex items-center gap-8">
          {user ? (
            <div className="flex items-center gap-8">
              <Link to="/profile" className="flex items-center gap-3 text-sm font-semibold hover:text-primary transition-all group">
                <div className="w-10 h-10 rounded-full border border-glass-border p-0.5 group-hover:border-primary/50 transition-all duration-300">
                  <div className="w-full h-full rounded-full bg-secondary-bg/50 flex items-center justify-center text-primary overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                </div>
                <span className="hidden lg:block text-text-primary/90">{user.name}</span>
              </Link>
              <Link to="/settings" className="text-text-secondary hover:text-primary transition-all duration-300 hover:rotate-45" title="Settings">
                <Settings className="w-5 h-5" />
              </Link>
              <button 
                onClick={onLogout}
                className="text-text-secondary hover:text-error transition-all duration-250 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-[11px] font-bold uppercase tracking-[0.2em] hover:text-primary transition-all">Login</Link>
              <Link to="/register" className="neon-button text-text-primary px-8 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em]">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-text-primary p-2 glass-card rounded-xl" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
            <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[70px] left-0 w-full bg-card-bg border-b border-glass-border p-6 flex flex-col gap-4 md:hidden shadow-2xl"
          >
            <Link to="/#features" className="text-text-secondary hover:text-primary" onClick={() => setIsOpen(false)}>Features</Link>
            <Link to="/dashboard" className="text-text-secondary hover:text-primary" onClick={() => setIsOpen(false)}>Dashboard</Link>
            <Link to="/admin" className="text-text-secondary hover:text-primary" onClick={() => setIsOpen(false)}>Admin</Link>
            <hr className="border-glass-border/50" />
            {user ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{user.name}</div>
                    <div className="text-[10px] text-text-secondary">{user.email}</div>
                  </div>
                </div>
                <Link to="/profile" className="text-text-secondary hover:text-primary px-2" onClick={() => setIsOpen(false)}>Profile Settings</Link>
                <Link to="/settings" className="text-text-secondary hover:text-primary px-2" onClick={() => setIsOpen(false)}>App Settings</Link>
                <button onClick={() => { onLogout(); setIsOpen(false); }} className="text-left px-2 py-2 font-medium text-error">Logout</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-left py-2 font-medium" onClick={() => setIsOpen(false)}>Login</Link>
                <Link to="/register" className="bg-primary text-text-primary py-3 rounded-[12px] font-semibold text-center" onClick={() => setIsOpen(false)}>Register</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Pages ---

const HelplineSection = () => {
  const helplines = [
    { name: "Police Emergency", number: "100" },
    { name: "Ambulance", number: "102" },
    { name: "Fire Emergency", number: "101" },
    { name: "Women Helpline", number: "1091" },
    { name: "Women Emergency", number: "181" },
    { name: "Child Helpline", number: "1098" }
  ];

  return (
    <section className="py-24 bg-dark-bg/30 border-t border-glass-border/60">
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-text-primary tracking-tight">Emergency Helplines</h2>
          <p className="text-text-secondary text-lg">Quick access to essential emergency services.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {helplines.map((h, i) => (
            <motion.a 
              key={i} 
              href={`tel:${h.number}`}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass-card p-8 text-center hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <PhoneCall className="w-5 h-5 text-primary" />
              </div>
              <div className="text-[11px] font-bold text-text-secondary uppercase mb-2 tracking-[0.2em] group-hover:text-text-primary transition-colors">{h.name}</div>
              <div className="text-xl font-bold text-primary group-hover:scale-110 transition-transform">{h.number}</div>
            </motion.a>
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-8 glass-card border border-primary/20 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary">Cyber Crime Helpline</h3>
              <p className="text-text-secondary text-sm">Report cyber crimes and online harassment instantly.</p>
            </div>
          </div>
          <a 
            href="tel:1930"
            className="neon-button text-text-primary px-10 py-4 rounded-[16px] font-bold text-xl transition-all flex items-center gap-3"
          >
            <PhoneCall className="w-6 h-6" /> 1930
          </a>
        </motion.div>
      </div>
    </section>
  );
};

const LandingPage = ({ onLogin }) => {
  const navigate = useNavigate();
  
  const handleDemo = () => {
    const demoUser = { 
      id: 'demo-user', 
      name: 'Demo User', 
      email: 'demo@safewalk.com', 
      phone: '+91 0000000000', 
      emergency: '+91 1111111111' 
    };
    localStorage.setItem('userId', demoUser.id);
    localStorage.setItem('user', JSON.stringify(demoUser));
    onLogin(demoUser);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-[90vh] flex items-center py-24 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-error/5 rounded-full blur-[120px] -z-10" style={{ animationDelay: '2s' }} />
        
        <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-[11px] font-bold mb-8 border border-primary/20 tracking-[0.2em] uppercase">
              <Zap className="w-3.5 h-3.5" /> Next-Gen Safety
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-8 text-text-primary tracking-tight">
              Smart Safety <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Navigation</span>
            </h1>
            <p className="text-lg text-text-secondary mb-12 max-w-[480px] leading-relaxed">
              Real-time safest routes with smart risk assessment and instant SOS emergency protection. Walk with confidence, anywhere.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/register" className="neon-button text-text-primary px-10 py-4.5 rounded-xl font-bold transition-all flex items-center gap-3 group">
                Get Started <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={handleDemo}
                className="glass-card border border-glass-border hover:bg-secondary-bg/30 text-text-primary px-10 py-4.5 rounded-xl font-bold transition-all"
              >
                Try Demo
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass-card p-6 shadow-2xl relative z-10 overflow-hidden">
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-error/30" />
                  <div className="w-3 h-3 rounded-full bg-warning/30" />
                  <div className="w-3 h-3 rounded-full bg-success/30" />
                </div>
                <div className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase">Neuro_Glass_v3.0</div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-secondary-bg/50 p-6 rounded-2xl border border-glass-border/50">
                  <div className="text-text-secondary text-[10px] uppercase font-bold mb-2 tracking-widest">Active Users</div>
                  <div className="text-3xl font-bold text-text-primary">1,284</div>
                </div>
                <div className="bg-secondary-bg/50 p-6 rounded-2xl border border-glass-border/60">
                  <div className="text-text-secondary text-[10px] uppercase font-bold mb-2 tracking-widest">Safety Score</div>
                  <div className="text-3xl font-bold text-primary">98.2%</div>
                </div>
              </div>
              <div className="h-[340px] bg-secondary-bg/50 rounded-2xl flex items-center justify-center text-text-secondary border border-glass-border/60 overflow-hidden relative">
                 <img src="https://picsum.photos/seed/map/800/600" alt="Map Preview" className="w-full h-full object-cover opacity-20 grayscale" />
                 <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 to-transparent" />
                 <div className="absolute bottom-6 left-6 right-6 p-4 glass-card border-glass-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--color-primary)]" />
                      <div className="text-[11px] font-bold text-text-primary tracking-widest uppercase">Live_Tracking_Active</div>
                    </div>
                 </div>
              </div>
            </div>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/15 rounded-full blur-[80px] -z-10" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-accent/10 rounded-full blur-[80px] -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-text-primary tracking-tight">Advanced Safety Features</h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">Everything you need to ensure personal safety during your daily commute or late-night walks.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: <Navigation className="text-primary w-7 h-7" />, title: "Safe Route Intelligence", desc: "Smart route calculation focusing on well-lit and populated paths." },
              { icon: <AlertTriangle className="text-error w-7 h-7" />, title: "Real-time SOS Alert", desc: "Instant emergency notification to admin and contacts with live location." },
              { icon: <MapPin className="text-primary w-7 h-7" />, title: "Live Location Tracking", desc: "Continuous GPS monitoring to ensure you're always on the right path." },
              { icon: <LayoutDashboard className="text-primary w-7 h-7" />, title: "Admin Monitoring", desc: "Centralized dashboard for security teams to manage active alerts." },
              { icon: <Zap className="text-primary w-7 h-7" />, title: "Lightweight Architecture", desc: "Fast, efficient, and works even on low-bandwidth connections." },
              { icon: <Lock className="text-primary w-7 h-7" />, title: "Privacy Focused", desc: "Your data is encrypted and only shared during active emergencies." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -8 }}
                className="glass-card p-10 hover:border-primary/20 group"
              >
                <div className="w-16 h-16 bg-secondary-bg/30 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary/10 transition-colors border border-glass-border/60">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-4 text-text-primary tracking-tight">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 bg-secondary-bg/10 border-y border-glass-border/60">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-text-primary tracking-tight">How It Works</h2>
            <p className="text-text-secondary text-lg">Four simple steps to a safer journey.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-12">
            {[
              { step: "01", title: "Register Account", desc: "Create your profile and add emergency contacts." },
              { step: "02", title: "Enter Destination", desc: "Input where you want to go on our smart map." },
              { step: "03", title: "Get Safest Route", desc: "Follow the smart-calculated safest path home." },
              { step: "04", title: "Emergency SOS", desc: "One-tap alert if you feel unsafe at any point." }
            ].map((s, i) => (
              <div key={i} className="relative group">
                <div className="text-7xl font-black text-text-primary/5 mb-6 group-hover:text-primary/10 transition-colors tracking-tighter">{s.step}</div>
                <h3 className="text-xl font-bold mb-3 text-text-primary tracking-tight">{s.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                {i < 3 && <div className="hidden md:block absolute top-12 -right-6 text-text-primary/10"><ChevronRight className="w-8 h-8" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Route Feature Section */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-text-primary leading-tight">Smart Safe <br /> <span className="text-primary">Route Calculation</span></h2>
            <p className="text-text-secondary mb-8 leading-relaxed text-lg">
              Our proprietary algorithm analyzes real-time data including street lighting, historical incidents, and foot traffic to provide you with the safest possible walking path, not just the shortest one.
            </p>
            <ul className="space-y-4">
              {[
                "Well-lit street prioritization",
                "High-traffic area routing",
                "Real-time risk assessment"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-text-primary/80">
                  <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-primary w-3.5 h-3.5" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card border border-glass-border rounded-[32px] p-3 shadow-2xl overflow-hidden group">
            <div className="h-[400px] rounded-[24px] overflow-hidden relative">
              <img src="https://picsum.photos/seed/route/800/600" alt="Route Preview" className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* SOS Feature Section */}
      <section className="py-24 bg-error/5 border-y border-glass-border/50">
        <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 flex justify-center">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-56 h-56 bg-gradient-to-br from-error to-accent rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.4)] cursor-pointer relative z-10"
              >
                <span className="text-5xl font-black text-text-primary tracking-tighter">SOS</span>
              </motion.div>
              <div className="absolute -inset-6 border-2 border-error/20 rounded-full animate-ping" />
              <div className="absolute -inset-12 border border-error/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-error leading-tight">Instant Emergency <br /> Protection</h2>
            <p className="text-text-secondary mb-8 leading-relaxed text-lg">
              In any threatening situation, a single tap triggers a high-priority SOS alert. Your live location, profile details, and emergency contacts are immediately shared with our 24/7 monitoring team.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 text-error font-bold hover:gap-4 transition-all">
              Learn more about SOS protection <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="container mx-auto px-6 max-w-[800px]">
          <h2 className="text-4xl md:text-6xl font-black mb-10 text-text-primary tracking-tight leading-tight">Start using SafeWalk today</h2>
          <p className="text-text-secondary mb-12 text-xl leading-relaxed">Join thousands of users who trust SafeWalk for their daily safety. It's free, secure, and life-saving.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/register" className="neon-button text-text-primary px-12 py-5 rounded-xl font-bold text-lg transition-all">
              Create Free Account
            </Link>
            <button 
              onClick={handleDemo}
              className="glass-card border border-glass-border hover:bg-secondary-bg/30 text-text-primary px-12 py-5 rounded-xl font-bold text-lg transition-all"
            >
              Try Demo Mode
            </button>
          </div>
        </div>
      </section>

      <HelplineSection />
    </div>
  );
};

const RegisterPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', emergency: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (err) {
        if (err.message.includes('offline')) {
          setError('Firestore is offline. Please ensure you have created a Firestore database in your Firebase project and that it is in "Test Mode" or has appropriate rules.');
          return;
        }
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
      
      let userData;
      if (!userDoc.exists()) {
        userData = {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          phone: '',
          emergency: '',
          photoURL: user.photoURL,
          role: 'user',
          createdAt: serverTimestamp()
        };
        try {
          await setDoc(userDocRef, userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      } else {
        userData = { id: user.uid, ...userDoc.data() };
      }

      localStorage.setItem('userId', user.uid);
      localStorage.setItem('user', JSON.stringify(userData));
      if (onLogin) onLogin(userData);
      navigate('/dashboard');
    } catch (err) {
      console.error("Google login error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Unauthorized domain. Please add "${window.location.hostname}" to the "Authorized domains" list in your Firebase Console (Authentication > Settings > Authorized domains).`);
      } else {
        setError('Google sign-up failed.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Create user document in Firestore using the uid
      const userData = {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        emergency: formData.emergency,
        role: 'user',
        createdAt: serverTimestamp()
      };
      
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userDocRef, userData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      // 3. Send email verification
      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.error("Email verification error:", err);
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please try logging in or use a different email.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is disabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else if (err.message.includes('offline')) {
        setError('Firestore is offline. Please ensure you have created a Firestore database in your Firebase project.');
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-20 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card border border-glass-border p-10 rounded-[32px] w-full max-w-[460px] shadow-2xl relative z-10 animate-float"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="mb-8">
          <h2 className="text-3xl font-black text-text-primary mb-2 tracking-tight">Create Account</h2>
          <p className="text-text-secondary text-sm">Join SafeWalk and walk with confidence.</p>
        </div>
        
        {success && (
          <div className="bg-success/10 border border-success/20 text-success p-4 rounded-[16px] text-sm mb-6 flex items-center gap-3">
            <CheckCircle className="w-4 h-4" /> Registration successful! A verification email has been sent. Please check your inbox before logging in.
          </div>
        )}
        
        {error && (
          <div className="bg-error/10 border border-error/20 text-error p-4 rounded-[16px] text-sm mb-6 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                required
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 pl-12 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-secondary/50"
                placeholder="John Doe"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input 
                type="email" 
                required
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 pl-12 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-secondary/50"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Phone</label>
              <input 
                type="tel" 
                required
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-secondary/50"
                placeholder="+91..."
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Emergency</label>
              <input 
                type="tel" 
                required
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-secondary/50"
                placeholder="+91..."
                value={formData.emergency}
                onChange={e => setFormData({...formData, emergency: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                required
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 pl-12 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-secondary/50"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="w-full neon-button text-text-primary p-5 rounded-xl font-bold transition-all mt-8 text-lg">
            Create Account
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-dark-bg px-4 text-text-secondary font-bold">Or continue with</span></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-secondary-bg/30 border border-glass-border text-text-primary p-4 rounded-[16px] font-bold flex items-center justify-center gap-3 hover:bg-secondary-bg/50 transition-all"
        >
          <Globe className="w-5 h-5 text-primary" /> Sign up with Google
        </button>

        <p className="text-center text-sm text-text-secondary mt-8">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        await signOut(auth);
        return;
      }
      
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (err) {
        if (err.message.includes('offline')) {
          setError('Firestore is offline. Please ensure you have created a Firestore database in your Firebase project.');
          return;
        }
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      if (userDoc.exists()) {
        const userData = { id: user.uid, ...userDoc.data() };
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/dashboard');
      } else {
        setError('User profile not found.');
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (err) {
        if (err.message.includes('offline')) {
          setError('Firestore is offline. Please ensure you have created a Firestore database in your Firebase project.');
          return;
        }
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
      
      let userData;
      if (!userDoc.exists()) {
        userData = {
          name: user.displayName,
          email: user.email,
          phone: '',
          emergency: '',
          photoURL: user.photoURL,
          role: 'user',
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', user.uid), userData);
        userData.id = user.uid;
      } else {
        userData = { id: user.uid, ...userDoc.data() };
      }

      localStorage.setItem('userId', userData.id);
      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData);
      navigate('/dashboard');
    } catch (err) {
      console.error("Google login error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Unauthorized domain. Please add "${window.location.hostname}" to the "Authorized domains" list in your Firebase Console (Authentication > Settings > Authorized domains).`);
      } else {
        setError('Google login failed.');
      }
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-20 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card border border-glass-border p-10 rounded-[32px] w-full max-w-[460px] shadow-2xl relative z-10 animate-float"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-text-primary mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-text-secondary text-sm">Securely login to your SafeWalk account.</p>
        </div>
        
        {error && (
          <div className="bg-error/10 border border-error/20 text-error p-4 rounded-[16px] text-sm mb-6 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input 
                type="email" 
                required
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 pl-12 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-secondary/50"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                required
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 pl-12 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-secondary/50"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="w-full neon-button text-text-primary p-5 rounded-xl font-bold transition-all mt-8 text-lg">
            Login Securely
          </button>
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-dark-bg px-4 text-text-secondary font-bold">Or Continue With</span></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="glass-card border border-glass-border hover:bg-secondary-bg/30 text-text-primary p-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-sm"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
              Google
            </button>
            <button 
              type="button"
              onClick={() => {
                const demoUser = { id: 'demo-user', name: 'Demo User', email: 'demo@safewalk.com', phone: '+91 0000000000', emergency: '+91 1111111111' };
                localStorage.setItem('userId', demoUser.id);
                localStorage.setItem('user', JSON.stringify(demoUser));
                onLogin(demoUser);
                navigate('/dashboard');
              }}
              className="glass-card border border-glass-border hover:bg-secondary-bg/30 text-text-primary p-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-sm"
            >
              <Zap className="w-4 h-4 text-primary" />
              Demo
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-text-secondary mt-8">
          Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
};

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
  const [isFindingSafePlaces, setIsFindingSafePlaces] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'alerts'),
        where('userId', '==', user.id),
        where('status', '==', 'active'),
        limit(1)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setActiveAlert({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
          setActiveAlert(null);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'alerts');
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'routes'),
        where('userId', '==', user.id),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const routes = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data, 
            route: typeof data.route === 'string' ? JSON.parse(data.route) : data.route 
          };
        });
        setRouteHistory(routes);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'routes');
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    // Voice Activation Setup
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
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setLocation(coords);
        setMapCenter(coords);
      },
      () => {
        const coords = [19.0760, 72.8777];
        setLocation(coords);
        setMapCenter(coords);
      }
    );
    fetchRouteHistory();
  }, [user]);

  const fetchRouteHistory = async () => {
    // Handled by onSnapshot now
  };

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
        route: JSON.stringify(routeCoords),
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
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${s[1]},${s[0]};${e[1]},${e[0]}?overview=full&geometries=geojson&alternatives=true`);
      if (!res.ok) throw new Error('Route calculation failed');
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        // Simulate safety scoring for alternatives
        const scoredRoutes = data.routes.map((r, index) => {
          const dist = r.distance / 1000;
          const dur = r.duration / 60;
          // Base score on distance, but add a random "safety factor" for demonstration
          // In a real app, this would use crime data, lighting, etc.
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

        // Sort by safety score descending
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
      
      // Start Live Tracking
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
      
      // WhatsApp Alert
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

  const findSafePlaces = async () => {
    if (!location) return;
    setIsFindingSafePlaces(true);
    setSafePlaces([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am at latitude ${location[0]} and longitude ${location[1]}. Find 5 nearby safe places like police stations, hospitals, and 24/7 open public spaces. Use the Google Maps tool to find them and provide their names and Google Maps links.`,
        config: {
          systemInstruction: "You are a safety assistant. Your goal is to find nearby safe locations for the user. Always use the Google Maps tool to find real, nearby places based on the provided coordinates.",
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: location[0],
                longitude: location[1]
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
      {/* Fake Call Overlay */}
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
                    <div className="text-xl font-bold text-primary">{routeInfo.distance}</div>
                    <div className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Distance (KM)</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-secondary-bg/20 border border-glass-border/50">
                    <div className="text-xl font-bold">{routeInfo.duration}</div>
                    <div className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Time (MIN)</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-secondary-bg/20 border border-glass-border/50">
            <div className="text-xl font-bold text-success">{routeInfo.safetyScore}%</div>
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
                onClick={activeAlert ? resolveMyAlert : triggerSOS}
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
                onClick={findSafePlaces}
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
            
            <button 
              onClick={() => setShowFakeCall(true)}
              className="glass-card p-8 flex flex-col items-center gap-4 group hover:border-primary/30 h-fit"
            >
              <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                <PhoneCall className="w-7 h-7 text-primary" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary group-hover:text-text-primary transition-colors text-center">
                Fake Call
              </span>
            </button>
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
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Dark Mode">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                </LayersControl>
                {location && (
                  <Marker position={location}>
                    <Popup>
                      <div className="p-2 text-center">
                        <div className="text-xs font-bold mb-1">Your Location</div>
                        <div className="text-[10px] text-text-secondary">Last updated: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {start && <Marker position={start}><Popup>Start</Popup></Marker>}
                {end && <Marker position={end}><Popup>Destination</Popup></Marker>}
                {route.length > 0 && <Polyline positions={route} color="#EF4444" weight={6} opacity={0.8} />}
              </MapContainer>
            ) : (
              <div className="h-full w-full bg-dark-bg flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Initializing Neural Map...</div>
              </div>
            )}
            
            {/* Map Overlays */}
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
            </div>
          </div>

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
                      <div className="text-[10px] font-black text-success tracking-widest uppercase">{h.safetyScore}% Safe</div>
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
    </div>
  );
};

const ProfilePage = ({ user, onUpdate }) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergency, setEmergency] = useState(user?.emergency || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Image size should be less than 2MB');
      return;
    }

    setIsUploading(true);
    setMessage('');

    try {
      const storageRef = ref(storage, `profile_pictures/${user.id}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setPhotoURL(downloadURL);
      setMessage('Image uploaded successfully! Click save to update profile.');
    } catch (err) {
      console.error("Upload error:", err);
      setMessage('Failed to upload image');
    }
    setIsUploading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !phone || !emergency) {
      setMessage('All fields are required');
      return;
    }
    
    // Basic phone validation
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phone)) {
      setMessage('Invalid phone number format');
      return;
    }
    if (!phoneRegex.test(emergency)) {
      setMessage('Invalid emergency contact format');
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', user.id);
      const updatedData = { name, phone, emergency, photoURL };
      await updateDoc(userRef, updatedData);
      
      const newUser = { ...user, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUser));
      onUpdate(newUser);
      setMessage('Profile updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      setMessage('An error occurred while updating your profile.');
    }
    setIsSaving(false);
  };

  if (!user) return <div className="py-20 text-center">Please login to view profile</div>;

  return (
    <div className="container mx-auto px-6 py-20 max-w-[600px]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border border-glass-border p-8 rounded-[32px] shadow-2xl relative z-10 animate-float"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="flex items-center gap-4 mb-8">
          <div className="relative group">
            <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center text-primary overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-all">
              {photoURL ? (
                <img src={photoURL} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-10 h-10" />
              )}
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-dark-bg/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-text-primary" />
                )}
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Edit Profile</h2>
            <p className="text-text-secondary text-sm">Keep your safety information up to date.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex justify-center mb-8">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
            >
              <Upload className="w-4 h-4" /> Change Profile Picture
            </button>
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Full Name</label>
            <input 
              type="text"
              className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-text-primary/20"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Phone Number</label>
            <input 
              type="text"
              className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-text-primary/20"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 0000000000"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Emergency Contact (WhatsApp)</label>
            <input 
              type="text"
              className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-text-primary/20"
              value={emergency}
              onChange={e => setEmergency(e.target.value)}
              placeholder="+91 1111111111"
            />
            <p className="text-[10px] text-text-secondary mt-2 ml-1">This number will be used for SOS alerts.</p>
          </div>

          <div className={`p-4 rounded-[12px] text-sm font-medium ${message.includes('success') ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            {message}
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-text-primary py-4 rounded-[16px] font-bold transition-all shadow-xl shadow-primary/20"
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const SettingsPage = ({ user, onUpdate }) => {
  const [settings, setSettings] = useState(user?.settings || {
    shareLocation: true,
    publicProfile: false,
    notifications: true,
    emergencyAlerts: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { settings });
      
      const newUser = { ...user, settings };
      localStorage.setItem('user', JSON.stringify(newUser));
      onUpdate(newUser);
      setMessage('Settings updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      setMessage('Failed to update settings');
    }
    setIsSaving(false);
  };

  if (!user) return <div className="py-20 text-center">Please login to view settings</div>;

  return (
    <div className="container mx-auto px-6 py-20 max-w-[600px] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card border border-glass-border p-10 rounded-[32px] shadow-2xl relative z-10 animate-float"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="flex items-center gap-6 mb-10">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-glass-border">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-text-primary tracking-tight">App Settings</h2>
            <p className="text-text-secondary text-sm font-medium tracking-wide uppercase text-[10px] mt-1">Privacy & Preferences</p>
          </div>
        </div>

        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] ml-1">Privacy Intelligence</h3>
            
            <div className="flex items-center justify-between p-6 glass-card bg-secondary-bg/10 border-glass-border/50 rounded-2xl group hover:border-glass-border transition-all">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-secondary-bg/30 rounded-xl flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors border border-glass-border/50">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary tracking-tight">Share Location</div>
                  <div className="text-[10px] text-text-secondary mt-1">Auto-share GPS during SOS events.</div>
                </div>
              </div>
              <button 
                onClick={() => handleToggle('shareLocation')}
                className={`w-14 h-7 rounded-full transition-all relative ${settings.shareLocation ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-secondary-bg/50'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-text-primary rounded-full transition-all ${settings.shareLocation ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-6 glass-card bg-secondary-bg/10 border-glass-border/50 rounded-2xl group hover:border-glass-border transition-all">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-secondary-bg/30 rounded-xl flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors border border-glass-border/50">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary tracking-tight">Public Profile</div>
                  <div className="text-[10px] text-text-secondary mt-1">Visible to other safety contributors.</div>
                </div>
              </div>
              <button 
                onClick={() => handleToggle('publicProfile')}
                className={`w-14 h-7 rounded-full transition-all relative ${settings.publicProfile ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-secondary-bg/50'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-text-primary rounded-full transition-all ${settings.publicProfile ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] ml-1">Neural Notifications</h3>
            
            <div className="flex items-center justify-between p-6 glass-card bg-secondary-bg/10 border-glass-border/50 rounded-2xl group hover:border-glass-border transition-all">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-secondary-bg/30 rounded-xl flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors border border-glass-border/50">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary tracking-tight">Push Alerts</div>
                  <div className="text-[10px] text-text-secondary mt-1">Nearby safety updates and warnings.</div>
                </div>
              </div>
              <button 
                onClick={() => handleToggle('notifications')}
                className={`w-14 h-7 rounded-full transition-all relative ${settings.notifications ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-secondary-bg/50'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-text-primary rounded-full transition-all ${settings.notifications ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-5 glass-card bg-secondary-bg/20 border-glass-border/50 rounded-[20px] group hover:border-glass-border transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-secondary-bg/30 rounded-xl flex items-center justify-center text-text-secondary group-hover:text-error transition-colors">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary">Emergency Alerts</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">Critical safety signals in your area.</div>
                </div>
              </div>
              <button 
                onClick={() => handleToggle('emergencyAlerts')}
                className={`w-14 h-7 rounded-full transition-all relative ${settings.emergencyAlerts ? 'bg-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-secondary-bg/50'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-text-primary rounded-full transition-all ${settings.emergencyAlerts ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-[16px] text-sm font-bold flex items-center gap-3 ${message.includes('success') ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
              {message.includes('success') ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {message}
            </div>
          )}

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full neon-button text-text-primary py-5 rounded-[16px] font-bold transition-all mt-4 text-lg disabled:opacity-50"
          >
            {isSaving ? 'Syncing Preferences...' : 'Save App Settings'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TrackingPage = ({ user }) => {
  const { userId } = useParams();
  const [alert, setAlert] = useState(null);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setAlert(data);
        setMapCenter([data.lat, data.lng]);
      } else {
        setAlert(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `alerts?userId=${userId}`);
    });

    return () => unsubscribe();
  }, [userId]);

  const resolveAlert = async () => {
    if (!alert) return;
    setIsResolving(true);
    try {
      await updateDoc(doc(db, 'alerts', alert.id), {
        status: 'resolved',
        resolvedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alerts/${alert.id}`);
    } finally {
      setIsResolving(false);
    }
  };

  if (!alert) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-secondary-bg/30 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-text-secondary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Active SOS Found</h2>
        <p className="text-text-secondary max-w-md">Either the alert has been resolved or the link is invalid.</p>
        <Link to="/" className="mt-8 text-primary font-bold flex items-center gap-2">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === userId || user?.id === 'demo-user';

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1200px]">
      <div className="glass-card overflow-hidden shadow-2xl relative z-10 animate-float">
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="p-8 border-b border-glass-border flex items-center justify-between bg-error/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center text-error animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Live Tracking: {alert.name}</h2>
              <p className="text-text-secondary text-xs">Emergency SOS Signal Active</p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-text-secondary uppercase">Last Updated</div>
            <div className="text-sm font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>

        <div className="h-[600px] relative">
          <MapContainer 
            center={mapCenter} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <ChangeView center={mapCenter} zoom={15} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[alert.lat, alert.lng]}>
              <Popup>
                <div className="text-xs font-bold">{alert.name} is here</div>
              </Popup>
            </Marker>
          </MapContainer>
          
          <div className="absolute bottom-6 left-6 z-[1000] bg-card-bg p-6 rounded-[24px] border border-glass-border shadow-2xl max-w-[300px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {alert.photoURL ? (
                  <img src={alert.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold">{alert.name}</div>
                <div className="text-[10px] text-text-secondary">{alert.phone}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Current Location</div>
              <div className="text-xs font-mono bg-secondary-bg/30 p-2 rounded-lg border border-glass-border/50">
                {alert.lat.toFixed(6)}, {alert.lng.toFixed(6)}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <a 
                href={`tel:${alert.phone}`}
                className="w-full bg-primary text-dark-bg py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
              >
                <PhoneCall className="w-4 h-4" /> Call User
              </a>
              
              {isOwner && (
                <button 
                  onClick={resolveAlert}
                  disabled={isResolving}
                  className="w-full bg-success text-text-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-success/90 transition-all shadow-lg shadow-success/20"
                >
                  <CheckCircle className="w-4 h-4" /> {isResolving ? 'Resolving...' : 'Resolve SOS'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('alerts');
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const qAlerts = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'));
    const unsubscribeAlerts = onSnapshot(qAlerts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(data);
      if (data.length > 0 && data[0].status === 'active') {
        setMapCenter([data[0].lat, data[0].lng]);
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

    return () => {
      unsubscribeAlerts();
      unsubscribeUsers();
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
        // Use email as ID or auto-generate. Let's auto-generate but check if email exists.
        const newUserRef = doc(collection(db, 'users'));
        await setDoc(newUserRef, {
          ...userData,
          createdAt: serverTimestamp(),
          uid: newUserRef.id // Store the ID in the document too
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

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1200px]">
      {/* Admin Statistics */}
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

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('alerts')}
          className={`px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'alerts' ? 'bg-primary text-dark-bg shadow-lg shadow-primary/20' : 'bg-secondary-bg/30 text-text-secondary hover:text-text-primary'}`}
        >
          SOS Alerts
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-primary text-dark-bg shadow-lg shadow-primary/20' : 'bg-secondary-bg/30 text-text-secondary hover:text-text-primary'}`}
        >
          User Management
        </button>
      </div>

      {activeTab === 'alerts' ? (
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

              {/* Quick Actions */}
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
                <ChangeView center={mapCenter} zoom={15} />
                <MapControls onRecenter={() => setMapCenter([19.0760, 72.8777])} />
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Google Streets">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Google Satellite">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Terrain">
                    <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Dark Mode">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  </LayersControl.BaseLayer>

                  <LayersControl.Overlay name="Transit">
                    <TileLayer url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png" />
                  </LayersControl.Overlay>
                  <LayersControl.Overlay name="Cycling">
                    <TileLayer url="https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=YOUR_API_KEY" />
                  </LayersControl.Overlay>
                </LayersControl>
                {alerts.map(alert => (
                  <Marker key={alert.id} position={[alert.lat, alert.lng]}>
                    <Popup>
                      <div className="text-xs">
                        <div className="font-bold">{alert.name}</div>
                        <div className="text-error font-bold uppercase text-[10px]">{alert.status} SOS</div>
                        <div>{alert.time}</div>
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
      ) : (
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

      {/* Edit User Modal */}
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

      {/* Delete User Modal */}
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

      {/* SOS History Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 glass-card overflow-hidden shadow-2xl relative z-10 animate-float"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="p-8 border-b border-glass-border flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-4 text-text-primary tracking-tight">
              <Activity className="text-primary w-7 h-7" /> SOS Alert History
            </h3>
            <p className="text-text-secondary text-sm mt-2 font-medium">Comprehensive log of all emergency signals received.</p>
          </div>
          
          <div className="flex bg-secondary-bg/30 p-1.5 rounded-2xl border border-glass-border/50 shadow-inner">
            {(['all', 'active', 'resolved']).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-8 py-2.5 rounded-xl text-[11px] font-bold transition-all capitalize tracking-widest ${historyFilter === f ? 'bg-primary text-text-primary shadow-lg shadow-primary/30' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary-bg/20 text-[11px] uppercase tracking-[0.2em] font-bold text-text-secondary">
                <th className="px-10 py-5">Timestamp</th>
                <th className="px-10 py-5">User Details</th>
                <th className="px-10 py-5">Location</th>
                <th className="px-10 py-5">Status</th>
                <th className="px-10 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border/50">
              {alerts
                .filter(a => historyFilter === 'all' || a.status === historyFilter)
                .map(alert => (
                  <tr key={alert.id} className="hover:bg-secondary-bg/10 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="text-sm font-bold text-text-primary tracking-tight">{alert.time}</div>
                      <div className="text-[10px] text-text-secondary mt-1 font-medium tracking-wide">{new Date(alert.timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
                          {alert.photoURL ? (
                            <img src={alert.photoURL} alt={alert.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            alert.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text-primary tracking-tight">{alert.name}</div>
                          <div className="text-[10px] text-text-secondary flex items-center gap-2 mt-1 font-medium">
                            <PhoneCall className="w-3 h-3" /> {alert.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <button 
                        onClick={() => {
                          setMapCenter([alert.lat, alert.lng]);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-[11px] text-text-secondary hover:text-primary flex items-center gap-2 transition-all font-bold tracking-wide"
                      >
                        <MapPin className="w-3.5 h-3.5" /> {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                      </button>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] border ${alert.status === 'active' ? 'bg-error/10 text-error border-error/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-success/10 text-success border-success/20'}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      {alert.status === 'active' ? (
                        <button 
                          onClick={() => resolveAlert(alert.id)}
                          className="bg-success hover:bg-success/90 text-text-primary text-[11px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-success/20"
                        >
                          Resolve
                        </button>
                      ) : (
                        <div className="text-success flex items-center justify-end gap-2 text-[11px] font-bold tracking-wide">
                          <CheckCircle className="w-4 h-4" /> Resolved
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {alerts.filter(a => historyFilter === 'all' || a.status === historyFilter).length === 0 && (
            <div className="py-20 text-center text-text-secondary text-sm">
              No {historyFilter !== 'all' ? historyFilter : ''} alerts found in history.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null); // 'offline' | 'permission' | null

  useEffect(() => {
    // Test Firestore Connection
    const testConnection = async () => {
      try {
        console.log("Testing Firestore connection...");
        // Use getDoc instead of getDocFromServer for the test to be slightly less aggressive
        // but still check the server if cache is empty
        await getDoc(doc(db, 'test', 'connection'));
        console.log("Firestore connection test successful.");
        setConnectionError(null);
      } catch (error) {
        console.error("Firestore connection test failed:", error);
        const msg = error instanceof Error ? error.message.toLowerCase() : '';
        if (msg.includes('offline')) {
          console.error("CRITICAL: Firestore is offline. Please ensure you have created a Firestore database in your Firebase project (safe-walk-f2a2c) at https://console.firebase.google.com/");
          setConnectionError('offline');
        } else if (msg.includes('permission') || msg.includes('insufficient')) {
          console.error("CRITICAL: Firestore permission denied. Please update your Security Rules in the Firebase Console (safe-walk-f2a2c) at https://console.firebase.google.com/");
          setConnectionError('permission');
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`, firebaseUser);
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const copyRulesToClipboard = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // DEBUG MODE: Allow any logged-in user to read/write EVERYTHING
    // Use this to test if your rules are the problem.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }

    // Public test document for connection check
    match /test/{docId} {
      allow read: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rules).then(() => {
      alert("DEBUG Security Rules copied! Paste these in your Firebase Console and click Publish to fix the error immediately.");
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-dark-bg text-text-primary selection:bg-primary/30 bg-animated-gradient">
        {connectionError && (
          <div className={`fixed top-0 left-0 right-0 z-[9999] backdrop-blur-md text-white p-4 text-center text-sm font-bold animate-pulse flex items-center justify-center gap-3 ${connectionError === 'offline' ? 'bg-error/90' : 'bg-warning/90'}`}>
            <AlertTriangle className="w-5 h-5" />
            <span>
              {connectionError === 'offline' 
                ? "Firestore is Offline! Please create a Firestore database in your Firebase Console (safe-walk-f2a2c) to enable all features."
                : "Firestore Permission Denied! Please update your Security Rules in the Firebase Console (safe-walk-f2a2c) to allow access."}
            </span>
            <a 
              href={`https://console.firebase.google.com/project/safe-walk-f2a2c/firestore/${connectionError === 'offline' ? 'databases' : 'rules'}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-white/80 transition-colors ml-2"
            >
              Open Console
            </a>
            {connectionError === 'permission' && (
              <button 
                onClick={copyRulesToClipboard}
                className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy Rules
              </button>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        <div className="particle-bg" />
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<LandingPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage onLogin={setUser} />} />
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/dashboard" element={<DashboardPage user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} onUpdate={setUser} />} />
          <Route path="/settings" element={<SettingsPage user={user} onUpdate={setUser} />} />
          <Route path="/track/:userId" element={<TrackingPage user={user} />} />
          <Route path="/admin" element={user?.role === 'admin' || user?.email === 'valism619@gmail.com' ? <AdminPage /> : <Navigate to="/dashboard" />} />
        </Routes>

        {/* Footer */}
        <footer className="py-24 border-t border-glass-border/50 bg-dark-bg/50">
          <div className="container mx-auto px-6 max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <Shield className="text-primary w-5 h-5" />
              <span className="text-lg font-bold text-text-primary tracking-tight">SafeWalk</span>
            </div>
            <div className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em]">
              &copy; {new Date().getFullYear()} SafeWalk Technologies. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Twitter className="w-4 h-4 text-text-secondary hover:text-primary cursor-pointer transition-colors" />
              <Facebook className="w-4 h-4 text-text-secondary hover:text-primary cursor-pointer transition-colors" />
              <Github className="w-4 h-4 text-text-secondary hover:text-primary cursor-pointer transition-colors" />
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
