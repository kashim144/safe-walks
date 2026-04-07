import React, { useState, useRef } from 'react';
import { 
  User, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Settings, 
  Mail, 
  Shield, 
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

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

    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file');
      return;
    }

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

  const isAdmin = user?.role === 'admin' || 
                  user?.email?.toLowerCase() === 'valism619@gmail.com' || 
                  user?.email?.toLowerCase() === 'shaikking032@gmail.com' ||
                  user?.name?.toLowerCase().includes('khasim basha shaik');

  if (!user) return <div className="py-20 text-center">Please login to view profile</div>;

  return (
    <div className="container mx-auto px-6 py-20 max-w-[600px]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border border-glass-border p-8 rounded-[32px] shadow-2xl relative z-10 animate-float"
      >
        {isAdmin && (
          <div className="absolute top-6 right-6 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2 z-20">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Admin Access</span>
          </div>
        )}
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none rounded-[32px]" />
        <div className="flex items-center gap-4 mb-8">
          <div className="relative group">
            <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center text-primary overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-all">
              {photoURL ? (
                <img src={photoURL} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-10 h-10" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-dark-bg/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 bg-primary text-dark-bg rounded-xl shadow-lg hover:scale-110 transition-transform active:scale-90"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*"
            />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-text-primary">{name || 'User Profile'}</h2>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mt-1">Personal Security Settings</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Full Name</label>
            <div className="relative">
              <input 
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                placeholder="Your full name"
              />
              <User className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-primary/20" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Account Role</label>
            <div className="relative">
              <input 
                type="text"
                value={user.role || 'user'}
                disabled
                className="w-full bg-secondary-bg/10 border border-glass-border/50 rounded-2xl p-4.5 text-sm text-text-primary/50 outline-none cursor-not-allowed capitalize"
              />
              <Shield className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-primary/10" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Email Address</label>
            <div className="relative">
              <input 
                type="email"
                value={user.email}
                disabled
                className="w-full bg-secondary-bg/10 border border-glass-border/50 rounded-2xl p-4.5 text-sm text-text-primary/50 outline-none cursor-not-allowed"
              />
              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-primary/10" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Phone Number</label>
            <div className="relative">
              <input 
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                placeholder="+1 234 567 8900"
              />
              <PhoneCall className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-primary/20" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] ml-1">Emergency Contact</label>
            <div className="relative">
              <input 
                type="tel"
                value={emergency}
                onChange={e => setEmergency(e.target.value)}
                className="w-full bg-secondary-bg/30 border border-glass-border rounded-2xl p-4.5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all"
                placeholder="+1 234 567 8900"
              />
              <Shield className="absolute right-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-primary/20" />
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${message.includes('success') ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}
              >
                {message.includes('success') ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isSaving || isUploading}
            className="w-full neon-button text-text-primary p-5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-[0.3em] disabled:opacity-50 shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
                Updating Profile...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
