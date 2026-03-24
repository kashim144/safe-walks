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
  AlertTriangle,
  CheckCircle,
  Share2,
  Copy,
  Twitter,
  Facebook,
  Plus,
  Minus,
  Locate
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

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

// --- Components ---

const MapControls = ({ onRecenter }: { onRecenter: () => void }) => {
  const map = useMap();
  
  return (
    <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
      <button 
        onClick={() => map.zoomIn()}
        className="w-10 h-10 bg-card-bg/90 backdrop-blur border border-primary/20 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all shadow-lg"
        title="Zoom In"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button 
        onClick={() => map.zoomOut()}
        className="w-10 h-10 bg-card-bg/90 backdrop-blur border border-primary/20 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all shadow-lg"
        title="Zoom Out"
      >
        <Minus className="w-5 h-5" />
      </button>
      <button 
        onClick={onRecenter}
        className="w-10 h-10 bg-card-bg/90 backdrop-blur border border-primary/20 rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all shadow-lg"
        title="Recenter on Me"
      >
        <Locate className="w-5 h-5" />
      </button>
    </div>
  );
};

const ChangeView = ({ center, zoom }: { center: [number, number], zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
};

const Navbar = ({ user, onLogout }: { user: any, onLogout: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 h-[70px] bg-dark-bg/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-6 h-full flex items-center justify-between max-w-[1200px]">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="text-primary w-8 h-8" />
          <span className="text-xl font-bold tracking-tight text-white">SafeWalk</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
          <Link to="/#features" className="hover:text-primary transition-colors">Features</Link>
          <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
          <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <User className="w-4 h-4" />
                </div>
                <span>{user.name}</span>
              </div>
              <button 
                onClick={onLogout}
                className="text-text-secondary hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
              <Link to="/register" className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-[12px] text-sm font-semibold transition-all shadow-lg shadow-primary/20">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-text-primary" onClick={() => setIsOpen(!isOpen)}>
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
            className="absolute top-[70px] left-0 w-full bg-card-bg border-b border-white/10 p-6 flex flex-col gap-4 md:hidden"
          >
            <Link to="/#features" className="text-text-secondary hover:text-primary" onClick={() => setIsOpen(false)}>Features</Link>
            <Link to="/dashboard" className="text-text-secondary hover:text-primary" onClick={() => setIsOpen(false)}>Dashboard</Link>
            <Link to="/admin" className="text-text-secondary hover:text-primary" onClick={() => setIsOpen(false)}>Admin</Link>
            <hr className="border-white/5" />
            {user ? (
              <button onClick={() => { onLogout(); setIsOpen(false); }} className="text-left py-2 font-medium text-red-500">Logout</button>
            ) : (
              <>
                <Link to="/login" className="text-left py-2 font-medium" onClick={() => setIsOpen(false)}>Login</Link>
                <Link to="/register" className="bg-primary text-white py-3 rounded-[12px] font-semibold text-center" onClick={() => setIsOpen(false)}>Register</Link>
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
    <section className="py-20 bg-dark-bg/50 border-t border-white/5">
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Emergency Helplines</h2>
          <p className="text-text-secondary">Quick access to essential emergency services.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {helplines.map((h, i) => (
            <a 
              key={i} 
              href={`tel:${h.number}`}
              className="bg-card-bg border border-white/10 p-6 rounded-[24px] text-center hover:border-primary/50 transition-all group"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <PhoneCall className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xs font-bold text-text-secondary uppercase mb-1">{h.name}</div>
              <div className="text-xl font-bold text-primary">{h.number}</div>
            </a>
          ))}
        </div>
        
        <div className="mt-12 p-8 bg-primary/5 border border-primary/20 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Cyber Crime Helpline</h3>
              <p className="text-text-secondary text-sm">Report cyber crimes and online harassment instantly.</p>
            </div>
          </div>
          <a 
            href="tel:1930"
            className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-[16px] font-bold text-xl transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
          >
            <PhoneCall className="w-6 h-6" /> 1930
          </a>
        </div>
      </div>
    </section>
  );
};

const LandingPage = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const navigate = useNavigate();
  
  const handleDemo = () => {
    const demoUser = { id: 'demo-user', name: 'Demo User', email: 'demo@safewalk.com', phone: '+91 0000000000', emergency: '+91 1111111111' };
    localStorage.setItem('userId', demoUser.id);
    localStorage.setItem('user', JSON.stringify(demoUser));
    onLogin(demoUser);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-[80vh] flex items-center py-20">
        <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-primary/20">
              <Zap className="w-3 h-3" /> NEXT-GEN SAFETY
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] mb-6">
              Smart Safety <br />
              <span className="text-primary">Navigation Platform</span>
            </h1>
            <p className="text-lg text-text-secondary mb-10 max-w-[480px] leading-relaxed">
              Real-time safest routes with smart risk assessment and instant SOS emergency protection. Walk with confidence, anywhere.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-[12px] font-bold transition-all flex items-center gap-2 group">
                Get Started <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={handleDemo}
                className="border border-white/10 hover:bg-white/5 text-white px-8 py-4 rounded-[12px] font-bold transition-all"
              >
                Try Demo
              </button>
            </div>
          </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="bg-card-bg border border-white/10 rounded-[24px] p-4 shadow-2xl relative z-10">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-blue-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <div className="text-[10px] font-mono text-text-secondary">DASHBOARD_PREVIEW_V2.0</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-dark-bg p-4 rounded-[16px] border border-white/5">
                <div className="text-text-secondary text-[10px] uppercase font-bold mb-1">Active Users</div>
                <div className="text-2xl font-bold">1,284</div>
              </div>
              <div className="bg-dark-bg p-4 rounded-[16px] border border-white/5">
                <div className="text-text-secondary text-[10px] uppercase font-bold mb-1">Safety Score</div>
                <div className="text-2xl font-bold text-green-500">98.2%</div>
              </div>
            </div>
            <div className="h-[320px] bg-dark-bg rounded-[16px] flex items-center justify-center text-text-secondary border border-white/5 overflow-hidden">
               <img src="https://picsum.photos/seed/map/800/600" alt="Map Preview" className="w-full h-full object-cover opacity-40" />
            </div>
          </div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10" />
        </motion.div>
      </div>
    </section>

    {/* Features Section */}
    <section id="features" className="py-20 bg-light-blue text-black">
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Advanced Safety Features</h2>
          <p className="text-black/70 max-w-2xl mx-auto">Everything you need to ensure personal safety during your daily commute or late-night walks.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Navigation className="text-black" />, title: "Safe Route Intelligence", desc: "Smart route calculation focusing on well-lit and populated paths." },
            { icon: <AlertTriangle className="text-red-600" />, title: "Real-time SOS Alert", desc: "Instant emergency notification to admin and contacts with live location." },
            { icon: <MapPin className="text-black" />, title: "Live Location Tracking", desc: "Continuous GPS monitoring to ensure you're always on the right path." },
            { icon: <LayoutDashboard className="text-black" />, title: "Admin Monitoring", desc: "Centralized dashboard for security teams to manage active alerts." },
            { icon: <Zap className="text-black" />, title: "Lightweight Architecture", desc: "Fast, efficient, and works even on low-bandwidth connections." },
            { icon: <Lock className="text-black" />, title: "Privacy Focused", desc: "Your data is encrypted and only shared during active emergencies." }
          ].map((f, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="bg-white/40 backdrop-blur-sm border border-black/10 p-8 rounded-[24px] transition-all hover:border-black/30 group"
            >
              <div className="w-12 h-12 bg-black/5 rounded-[16px] flex items-center justify-center mb-6 group-hover:bg-black/10 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-black/70 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section className="py-20">
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-text-secondary">Four simple steps to a safer journey.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Register Account", desc: "Create your profile and add emergency contacts." },
            { step: "02", title: "Enter Destination", desc: "Input where you want to go on our smart map." },
            { step: "03", title: "Get Safest Route", desc: "Follow the smart-calculated safest path home." },
            { step: "04", title: "Emergency SOS", desc: "One-tap alert if you feel unsafe at any point." }
          ].map((s, i) => (
            <div key={i} className="relative">
              <div className="text-5xl font-black text-white/5 mb-4">{s.step}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-text-secondary text-sm">{s.desc}</p>
              {i < 3 && <div className="hidden md:block absolute top-6 -right-4 text-white/10"><ChevronRight /></div>}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Route Feature Section */}
    <section className="py-20 bg-light-blue text-black">
      <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Smart Safe <br /> Route Calculation</h2>
          <p className="text-black/70 mb-8 leading-relaxed">
            Our proprietary algorithm analyzes real-time data including street lighting, historical incidents, and foot traffic to provide you with the safest possible walking path, not just the shortest one.
          </p>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle className="text-black w-5 h-5" /> Well-lit street prioritization
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle className="text-black w-5 h-5" /> High-traffic area routing
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle className="text-black w-5 h-5" /> Real-time risk assessment
            </li>
          </ul>
        </div>
        <div className="bg-white/20 border border-black/10 rounded-[24px] p-2 shadow-2xl">
          <div className="h-[320px] rounded-[18px] overflow-hidden">
            <img src="https://picsum.photos/seed/route/800/600" alt="Route Preview" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>
      </div>
    </section>

    {/* SOS Feature Section */}
    <section className="py-20 bg-red-600/5 border-y border-red-600/10">
      <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
        <div className="order-2 md:order-1 flex justify-center">
          <div className="relative">
            <div className="w-48 h-48 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-pulse cursor-pointer">
              <span className="text-4xl font-black text-white">SOS</span>
            </div>
            <div className="absolute -inset-4 border-2 border-red-600/20 rounded-full animate-ping" />
          </div>
        </div>
        <div className="order-1 md:order-2">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-red-500">Instant Emergency <br /> Protection</h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            In any threatening situation, a single tap triggers a high-priority SOS alert. Your live location, profile details, and emergency contacts are immediately shared with our 24/7 monitoring team.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 text-red-500 font-bold hover:gap-4 transition-all">
            Learn more about SOS protection <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="py-32 text-center">
      <div className="container mx-auto px-6 max-w-[800px]">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-8">Start using SafeWalk today</h2>
        <p className="text-text-secondary mb-10 text-lg">Join thousands of users who trust SafeWalk for their daily safety. It's free, secure, and life-saving.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/register" className="bg-primary hover:bg-primary/90 text-white px-12 py-5 rounded-[16px] font-bold text-lg transition-all shadow-xl shadow-primary/20">
            Create Free Account
          </Link>
          <button 
            onClick={handleDemo}
            className="border border-white/10 hover:bg-white/5 text-white px-12 py-5 rounded-[16px] font-bold text-lg transition-all"
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

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', emergency: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        navigate('/login');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border border-white/10 p-8 rounded-[24px] w-full max-w-[420px] shadow-2xl"
      >
        <h2 className="text-2xl font-bold mb-2">Create Account</h2>
        <p className="text-text-secondary text-sm mb-8">Join SafeWalk and walk with confidence.</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-[12px] text-sm mb-6">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 block">Full Name</label>
            <input 
              type="text" 
              required
              className="w-full bg-dark-bg border border-white/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
              placeholder="John Doe"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 block">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-dark-bg border border-white/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
              placeholder="john@example.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 block">Phone Number</label>
            <input 
              type="tel" 
              required
              className="w-full bg-dark-bg border border-white/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 block">Emergency Contact</label>
            <input 
              type="tel" 
              required
              className="w-full bg-dark-bg border border-white/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
              placeholder="+91 9876543211"
              value={formData.emergency}
              onChange={e => setFormData({...formData, emergency: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white p-4 rounded-[12px] font-bold transition-all mt-4">
            Create Account
          </button>
        </form>
        <p className="text-center text-xs text-text-secondary mt-6">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [formData, setFormData] = useState({ email: '', phone: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
        navigate('/dashboard');
      } else {
        setError('Invalid email or phone number.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border border-white/10 p-8 rounded-[24px] w-full max-w-[420px] shadow-2xl"
      >
        <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
        <p className="text-text-secondary text-sm mb-8">Login to your SafeWalk account.</p>
        
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-[12px] text-sm mb-6">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 block">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-dark-bg border border-white/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
              placeholder="john@example.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-1.5 block">Phone Number</label>
            <input 
              type="tel" 
              required
              className="w-full bg-dark-bg border border-white/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white p-4 rounded-[12px] font-bold transition-all mt-4">
            Login
          </button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card-bg px-2 text-text-secondary">Or</span></div>
          </div>
          <button 
            type="button"
            onClick={() => {
              const demoUser = { id: 'demo-user', name: 'Demo User', email: 'demo@safewalk.com', phone: '+91 0000000000', emergency: '+91 1111111111' };
              localStorage.setItem('userId', demoUser.id);
              localStorage.setItem('user', JSON.stringify(demoUser));
              onLogin(demoUser);
              navigate('/dashboard');
            }}
            className="w-full border border-white/10 hover:bg-white/5 text-white p-4 rounded-[12px] font-bold transition-all"
          >
            Try Demo Mode
          </button>
        </form>
        <p className="text-center text-xs text-text-secondary mt-6">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
};

const DashboardPage = ({ user }: { user: any }) => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [startAddr, setStartAddr] = useState('');
  const [endAddr, setEndAddr] = useState('');
  const [route, setRoute] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [routeHistory, setRouteHistory] = useState<any[]>([]);
  const [sosStatus, setSosStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setLocation(coords);
        setMapCenter(coords);
      },
      () => {
        const coords: [number, number] = [19.0760, 72.8777];
        setLocation(coords);
        setMapCenter(coords);
      }
    );
    fetchRouteHistory();
  }, [user]);

  const fetchRouteHistory = async () => {
    try {
      const res = await fetch(`/api/routes/${user.id}`);
      const data = await res.json();
      setRouteHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const saveRouteToHistory = async (info: any, routeCoords: any) => {
    try {
      await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          startAddr,
          endAddr,
          distance: info.distance,
          duration: info.duration,
          safetyScore: info.safetyScore,
          route: routeCoords
        })
      });
      fetchRouteHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const geocode = async (address: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number];
      }
      return null;
    } catch (err) {
      console.error(err);
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
      alert("Could not find one or both locations. Please try a more specific address.");
    }
    setIsSearching(false);
  };

  const calculateRoute = async (s: [number, number], e: [number, number]) => {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${s[1]},${s[0]};${e[1]},${e[0]}?overview=full&geometries=geojson&alternatives=true`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        // Simulate safety scoring for alternatives
        const scoredRoutes = data.routes.map((r: any, index: number) => {
          const dist = r.distance / 1000;
          const dur = r.duration / 60;
          // Base score on distance, but add a random "safety factor" for demonstration
          // In a real app, this would use crime data, lighting, etc.
          const safetyFactor = 85 + (Math.random() * 15); 
          const safetyScore = (safetyFactor - dist * 0.2).toFixed(1);
          
          return {
            coords: r.geometry.coordinates.map((c: any) => [c[1], c[0]]),
            distance: dist.toFixed(2),
            duration: Math.round(dur),
            safetyScore,
            index
          };
        });

        // Sort by safety score descending
        scoredRoutes.sort((a: any, b: any) => parseFloat(b.safetyScore) - parseFloat(a.safetyScore));
        
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
    if (!location) return;
    setSosStatus('sending');
    try {
      await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          lat: location[0],
          lng: location[1]
        })
      });
      setSosStatus('sent');
      setTimeout(() => setSosStatus('idle'), 5000);
    } catch (err) {
      setSosStatus('idle');
    }
  };

  const trigger112 = () => {
    if (!location) return;
    const message = `EMERGENCY SOS: I am at https://www.google.com/maps?q=${location[0]},${location[1]}. Please help! - Sent via SafeWalk`;
    const whatsappUrl = `https://wa.me/${user.emergency.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareRoute = (startName: string, endName: string, score: string) => {
    const text = `I just found a safe route from ${startName} to ${endName} with a ${score}% safety score using SafeWalk! 🛡️🚶‍♂️`;
    const url = window.location.origin;
    
    return {
      copy: () => {
        navigator.clipboard.writeText(`${text} Check it out: ${url}`);
        alert("Link copied to clipboard!");
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
    <div className="container mx-auto px-6 py-10 max-w-[1200px]">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card-bg border border-primary/20 p-6 rounded-[24px] shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Navigation className="text-primary w-5 h-5" /> Route Planner
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block">Start Location</label>
                <input 
                  type="text"
                  placeholder="Enter starting point..."
                  className="w-full bg-dark-bg border border-primary/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
                  value={startAddr}
                  onChange={e => setStartAddr(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block">Destination</label>
                <input 
                  type="text"
                  placeholder="Enter destination..."
                  className="w-full bg-dark-bg border border-primary/10 rounded-[12px] p-3 text-sm focus:border-primary outline-none transition-all"
                  value={endAddr}
                  onChange={e => setEndAddr(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => { setStart(null); setEnd(null); setRoute([]); setRouteInfo(null); setStartAddr(''); setEndAddr(''); }}
                  className="flex-1 border border-primary/10 hover:bg-white/5 p-3 rounded-[12px] text-sm font-bold transition-all"
                >
                  Reset
                </button>
                <button 
                  onClick={handleSearch}
                  disabled={!startAddr || !endAddr || isSearching}
                  className="flex-[2] bg-primary hover:bg-primary/90 disabled:opacity-50 text-black p-3 rounded-[12px] text-sm font-bold transition-all"
                >
                  {isSearching ? 'Searching...' : 'Predict Route'}
                </button>
              </div>
            </div>

            {routeInfo && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-6 border-t border-primary/10 space-y-4"
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{routeInfo.distance}</div>
                    <div className="text-[10px] text-text-secondary uppercase">KM</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{routeInfo.duration}</div>
                    <div className="text-[10px] text-text-secondary uppercase">MIN</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-500">{routeInfo.safetyScore}%</div>
                    <div className="text-[10px] text-text-secondary uppercase">SAFE</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button 
                    onClick={() => shareRoute(startAddr, endAddr, routeInfo.safetyScore).copy()}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 rounded-[12px] text-[10px] font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <button 
                    onClick={() => shareRoute(startAddr, endAddr, routeInfo.safetyScore).twitter()}
                    className="bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 p-2.5 rounded-[12px] text-blue-400 transition-all"
                    title="Share on Twitter"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => shareRoute(startAddr, endAddr, routeInfo.safetyScore).facebook()}
                    className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 p-2.5 rounded-[12px] text-blue-600 transition-all"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-[24px] shadow-xl">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-4 h-4" /> SOS
              </h3>
              <button 
                onClick={triggerSOS}
                disabled={sosStatus === 'sending'}
                className={`w-full py-3 rounded-[12px] text-xs font-bold transition-all ${
                  sosStatus === 'sent' ? 'bg-green-500 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {sosStatus === 'idle' && 'ALERT'}
                {sosStatus === 'sending' && '...'}
                {sosStatus === 'sent' && 'SENT'}
              </button>
            </div>
            <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-[24px] shadow-xl">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-red-500">
                <PhoneCall className="w-4 h-4" /> 112
              </h3>
              <button 
                onClick={trigger112}
                className="w-full py-3 rounded-[12px] text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all"
              >
                WHATSAPP
              </button>
            </div>
          </div>

          <div className="bg-card-bg border border-primary/10 p-6 rounded-[24px] shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="text-primary w-5 h-5" /> Recent Routes
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {routeHistory.length === 0 ? (
                <div className="text-center py-8 text-text-secondary text-sm">
                  No previous routes found.
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
                    className="p-3 bg-dark-bg border border-white/5 rounded-[16px] hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-[10px] font-bold text-primary uppercase">{h.time}</div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            shareRoute(h.startAddr, h.endAddr, h.safetyScore).copy();
                          }}
                          className="p-1 hover:text-primary transition-colors"
                          title="Copy Share Link"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                        <div className="text-[10px] font-bold text-green-500">{h.safetyScore}% SAFE</div>
                      </div>
                    </div>
                    <div className="text-xs font-medium truncate mb-1 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {h.startAddr}
                    </div>
                    <div className="text-xs font-medium truncate flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {h.endAddr}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="h-[600px] rounded-[24px] overflow-hidden border border-primary/10 shadow-2xl relative">
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
                  <LayersControl.BaseLayer checked name="Google Maps Style">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Light Mode">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
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
                {location && <Marker position={location}><Popup>Your Location</Popup></Marker>}
                {start && <Marker position={start}><Popup>Start</Popup></Marker>}
                {end && <Marker position={end}><Popup>Destination</Popup></Marker>}
                {route.length > 0 && <Polyline positions={route} color="#4285F4" weight={6} opacity={0.8} />}
              </MapContainer>
            ) : (
              <div className="h-full w-full bg-dark-bg flex items-center justify-center text-primary">
                Loading Map...
              </div>
            )}
            <div className="absolute top-4 left-4 z-[1000] bg-card-bg/90 backdrop-blur px-4 py-2 rounded-full border border-primary/10 text-xs font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> LIVE GPS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPage = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.0760, 72.8777]);

  useEffect(() => {
    fetchAlerts();
    socket.on('new_alert', (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
      setMapCenter([newAlert.lat, newAlert.lng]);
    });
    return () => { socket.off('new_alert'); };
  }, []);

  const fetchAlerts = async () => {
    const res = await fetch('/api/alerts');
    const data = await res.json();
    setAlerts(data);
  };

  const resolveAlert = async (id: string) => {
    await fetch('/api/alerts/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchAlerts();
  };

  return (
    <div className="container mx-auto px-6 py-10 max-w-[1200px]">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card-bg border border-white/10 p-6 rounded-[24px] shadow-xl h-[600px] flex flex-col">
            <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2"><Bell className="text-red-500 w-5 h-5" /> SOS Alerts</div>
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{alerts.filter(a => a.status === 'active').length}</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="text-center text-text-secondary text-sm py-20">No alerts recorded.</div>
              ) : (
                alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    onClick={() => setMapCenter([alert.lat, alert.lng])}
                    className={`p-4 rounded-[16px] border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${alert.status === 'active' ? 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/10' : 'bg-green-500/5 border-green-500/10 opacity-80'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-sm text-text-primary">{alert.name}</div>
                      <div className="text-[10px] text-text-secondary flex flex-col items-end">
                        <span>{alert.time}</span>
                        {alert.status === 'resolved' && (
                          <span className="text-green-500 flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3" /> Resolved
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      <div className="text-[10px] text-text-secondary flex items-center gap-2">
                        <PhoneCall className="w-3 h-3 text-primary" /> {alert.phone || 'N/A'}
                      </div>
                      <div className="text-[10px] text-text-secondary flex items-center gap-2">
                        <User className="w-3 h-3 text-primary" /> {alert.email || 'N/A'}
                      </div>
                      <div className="text-[10px] text-text-secondary flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-primary" /> {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                      </div>
                    </div>

                    {alert.status === 'active' && (
                      <button 
                        onClick={() => resolveAlert(alert.id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold py-2.5 rounded-[10px] transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-3 h-3" /> Mark Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="h-[600px] rounded-[24px] overflow-hidden border border-primary/10 shadow-2xl relative">
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
                      <div className="text-red-500 font-bold uppercase text-[10px]">{alert.status} SOS</div>
                      <div>{alert.time}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="absolute top-4 right-4 z-[1000] bg-card-bg/90 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-xs font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> LIVE MONITORING
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen selection:bg-primary/30">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<LandingPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/dashboard" element={<DashboardPage user={user} />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>

        {/* Footer */}
        <footer className="py-20 border-t border-white/5 bg-dark-bg">
          <div className="container mx-auto px-6 max-w-[1200px] text-center text-text-secondary text-xs">
            &copy; {new Date().getFullYear()} SafeWalk Technologies. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
}
