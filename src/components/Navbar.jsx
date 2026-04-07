import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  MapPin 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin' || 
                  user?.email?.toLowerCase() === 'valism619@gmail.com' || 
                  user?.email?.toLowerCase() === 'shaikking032@gmail.com' ||
                  user?.name?.toLowerCase().includes('khasim basha shaik');

  return (
    <nav className="sticky top-0 z-50 h-20 bg-dark-bg/80 backdrop-blur-xl border-b border-glass-border">
      <div className="container mx-auto px-6 h-full flex items-center justify-between max-w-[1200px]">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-11 h-11 bg-primary/15 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300 border border-primary/20 shadow-lg shadow-primary/5">
            <Shield className="text-primary w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-text-primary">SafeWalk</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10 text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em]">
          <Link to="/#features" className="hover:text-primary transition-all duration-250">Features</Link>
          <Link to="/dashboard" className="hover:text-primary transition-all duration-250">Dashboard</Link>
          {isAdmin && (
            <Link to="/admin" className="hover:text-primary transition-all duration-250 flex items-center gap-2">
              <LayoutDashboard className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
          {user && (
            <Link to={`/track/${user.id}`} className="hover:text-primary transition-all duration-250 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Live Track
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-8">
          {user ? (
            <div className="flex items-center gap-8">
              <Link to="/profile" className="flex items-center gap-3 text-sm font-semibold hover:text-primary transition-all group">
                <div className="w-10 h-10 rounded-full border border-glass-border p-0.5 group-hover:border-primary/50 transition-all duration-300 overflow-hidden">
                  <div className="w-full h-full rounded-full bg-secondary-bg/50 flex items-center justify-center text-primary overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                </div>
                <span className="hidden lg:block text-text-primary/90 font-bold tracking-tight">{user.name}</span>
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
            className="absolute top-20 left-0 w-full bg-card-bg border-b border-glass-border p-8 flex flex-col gap-6 md:hidden shadow-2xl z-50"
          >
            <Link to="/#features" className="text-sm font-bold text-text-secondary uppercase tracking-widest hover:text-primary" onClick={() => setIsOpen(false)}>Features</Link>
            <Link to="/dashboard" className="text-sm font-bold text-text-secondary uppercase tracking-widest hover:text-primary" onClick={() => setIsOpen(false)}>Dashboard</Link>
            {isAdmin && (
              <Link to="/admin" className="text-sm font-bold text-text-secondary uppercase tracking-widest hover:text-primary" onClick={() => setIsOpen(false)}>Admin Panel</Link>
            )}
            {user && (
              <Link to={`/track/${user.id}`} className="text-sm font-bold text-text-secondary uppercase tracking-widest hover:text-primary" onClick={() => setIsOpen(false)}>Live Tracking</Link>
            )}
            <hr className="border-glass-border/50" />
            {user ? (
              <div className="flex flex-col gap-6">
                <Link to="/profile" className="flex items-center gap-4" onClick={() => setIsOpen(false)}>
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{user.name}</div>
                    <div className="text-[10px] text-text-secondary uppercase tracking-widest">{user.email}</div>
                  </div>
                </Link>
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/settings" className="glass-card p-4 text-center text-[10px] font-bold uppercase tracking-widest text-text-secondary" onClick={() => setIsOpen(false)}>Settings</Link>
                  <button onClick={() => { onLogout(); setIsOpen(false); }} className="glass-card p-4 text-center text-[10px] font-bold uppercase tracking-widest text-error">Logout</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Link to="/login" className="glass-card p-4 text-center text-[10px] font-bold uppercase tracking-widest text-text-primary" onClick={() => setIsOpen(false)}>Login</Link>
                <Link to="/register" className="neon-button p-4 text-center text-[10px] font-bold uppercase tracking-widest text-text-primary" onClick={() => setIsOpen(false)}>Register</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
