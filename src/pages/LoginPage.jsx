import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Mail, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ArrowRight,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      let userData;
      
      const isTargetAdmin = user.email?.toLowerCase() === 'valism619@gmail.com' || 
                           user.email?.toLowerCase() === 'shaikking032@gmail.com';

      if (!userDoc.exists()) {
        userData = {
          id: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: isTargetAdmin ? 'admin' : 'user',
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, userData);
      } else {
        userData = { id: userDoc.id, email: user.email, ...userDoc.data() };
        if (isTargetAdmin && userData.role !== 'admin') {
          userData.role = 'admin';
          await updateDoc(userDocRef, { role: 'admin' });
        }
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData);
      navigate('/dashboard');
    } catch (err) {
      console.error("Google login error:", err);
      setError("Failed to login with Google. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        let userData = { id: userDoc.id, email: user.email, ...userDoc.data() };
        
        // Force admin role if email matches
        const isTargetAdmin = user.email?.toLowerCase() === 'valism619@gmail.com' || 
                             user.email?.toLowerCase() === 'shaikking032@gmail.com';
        
        if (isTargetAdmin && userData.role !== 'admin') {
          userData.role = 'admin';
          await updateDoc(userDocRef, { role: 'admin' });
        }
        
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/dashboard');
      } else {
        // Create profile if it doesn't exist (shouldn't happen with email login usually but good for safety)
        const userData = {
          id: user.uid,
          name: user.displayName || email.split('@')[0],
          email: user.email,
          role: (user.email?.toLowerCase() === 'valism619@gmail.com' || user.email?.toLowerCase() === 'shaikking032@gmail.com') ? 'admin' : 'user',
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, userData);
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Email login error:", err);
      setError("Invalid email or password.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const demoUser = {
        id: 'demo-user-123',
        name: 'Demo User',
        email: 'demo@safewalk.app',
        role: 'user',
        phone: '+1 234 567 8900',
        emergency: '+1 987 654 3210'
      };
      localStorage.setItem('user', JSON.stringify(demoUser));
      onLogin(demoUser);
      navigate('/dashboard');
    } catch (err) {
      setError("Failed to start demo. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="particle-bg opacity-30" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-10 relative z-10 animate-float"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/20 border border-primary/20 group hover:scale-110 transition-transform duration-500">
            <Shield className="w-10 h-10 text-primary group-hover:animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight mb-2">SafeWalk</h1>
          <p className="text-text-secondary text-sm font-bold uppercase tracking-[0.3em]">Neural Safety Network</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 bg-error/10 border border-error/20 text-error p-4 rounded-2xl text-xs font-bold flex items-center gap-3 overflow-hidden"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-error/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative group">
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-primary/20"
                placeholder="name@example.com"
              />
              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-primary/20 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em]">Password</label>
              <Link to="/forgot-password" title="Forgot Password" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Forgot?</Link>
            </div>
            <div className="relative group">
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-text-primary/20"
                placeholder="••••••••"
              />
              <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-primary/20 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full neon-button text-text-primary p-5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.3em] disabled:opacity-50 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group"
          >
            {isLoggingIn ? 'Authenticating...' : (
              <>
                Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border/50"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black"><span className="bg-card-bg px-4 text-text-secondary">Or connect with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="flex items-center justify-center gap-3 bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-4 rounded-2xl transition-all group"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary">Google</span>
            </button>
            <button 
              onClick={handleDemoLogin}
              disabled={isLoggingIn}
              className="flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 p-4 rounded-2xl transition-all group"
            >
              <User className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Demo</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] font-bold text-text-secondary uppercase tracking-widest mt-10">
          Don't have an account? <Link to="/register" className="text-primary hover:underline ml-2">Register Now</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
