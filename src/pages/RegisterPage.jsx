import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

const RegisterPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    emergency: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleGoogleLogin = async () => {
    setIsRegistering(true);
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
      console.error("Google registration error:", err);
      setError("Failed to register with Google. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.emergency || !formData.password) {
      setError("All fields are required.");
      return;
    }
    setIsRegistering(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const userData = {
        id: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        emergency: formData.emergency,
        role: (formData.email?.toLowerCase() === 'valism619@gmail.com' || formData.email?.toLowerCase() === 'shaikking032@gmail.com') ? 'admin' : 'user',
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      await sendEmailVerification(user);
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="particle-bg opacity-30" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg glass-card p-10 relative z-10 animate-float"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight mb-2">Join SafeWalk</h1>
          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.3em]">Create your neural safety profile</p>
        </div>

        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8 bg-success/10 border border-success/20 text-success p-5 rounded-2xl text-xs font-bold flex items-center gap-4"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Registration successful! A verification email has been sent. Redirecting to login...</span>
            </motion.div>
          )}
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 bg-error/10 border border-error/20 text-error p-4 rounded-2xl text-xs font-bold flex items-center gap-3"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Full Name</label>
              <div className="relative">
                <input 
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                  placeholder="John Doe"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/20" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Email Address</label>
              <div className="relative">
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                  placeholder="john@example.com"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/20" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Phone Number</label>
              <div className="relative">
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                  placeholder="+1 234 567 8900"
                />
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/20" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Emergency Contact</label>
              <div className="relative">
                <input 
                  type="tel"
                  value={formData.emergency}
                  onChange={e => setFormData({...formData, emergency: e.target.value})}
                  className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                  placeholder="+1 987 654 3210"
                />
                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/20" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Password</label>
            <div className="relative">
              <input 
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                placeholder="••••••••"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/20" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isRegistering || success}
            className="w-full neon-button text-text-primary p-5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.3em] disabled:opacity-50 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group"
          >
            {isRegistering ? 'Processing...' : (
              <>
                Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10">
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border/50"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black"><span className="bg-card-bg px-4 text-text-secondary">Or join with</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isRegistering}
            className="w-full flex items-center justify-center gap-3 bg-secondary-bg/30 hover:bg-secondary-bg/50 border border-glass-border p-4 rounded-2xl transition-all group"
          >
            <Globe className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary">Google Account</span>
          </button>
        </div>

        <p className="text-center text-[11px] font-bold text-text-secondary uppercase tracking-widest mt-10">
          Already have an account? <Link to="/login" className="text-primary hover:underline ml-2">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
