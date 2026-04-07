import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Eye, 
  Lock, 
  Globe, 
  Moon, 
  Volume2, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight,
  X,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SettingsPage = ({ user }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [voiceSOS, setVoiceSOS] = useState(true);
  const [fallDetection, setFallDetection] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSave = () => {
    setSuccess("Settings updated successfully!");
    setTimeout(() => setSuccess(null), 3000);
  };

  const settingsGroups = [
    {
      title: "Safety & Security",
      items: [
        { id: 'voice', icon: <Volume2 className="w-5 h-5" />, label: "Voice SOS Activation", desc: "Trigger SOS by saying 'HELP'", active: voiceSOS, setter: setVoiceSOS },
        { id: 'fall', icon: <Smartphone className="w-5 h-5" />, label: "Fall Detection", desc: "Auto-trigger SOS on sudden impact", active: fallDetection, setter: setFallDetection },
        { id: 'privacy', icon: <Eye className="w-5 h-5" />, label: "Stealth Mode", desc: "Hide app activity from task switcher", active: privacyMode, setter: setPrivacyMode },
      ]
    },
    {
      title: "Preferences",
      items: [
        { id: 'notif', icon: <Bell className="w-5 h-5" />, label: "Push Notifications", desc: "Alerts for nearby safety updates", active: notifications, setter: setNotifications },
        { id: 'dark', icon: <Moon className="w-5 h-5" />, label: "Dark Interface", desc: "Optimized for low-light visibility", active: darkMode, setter: setDarkMode },
        { id: 'lang', icon: <Globe className="w-5 h-5" />, label: "Language", desc: "English (US)", type: 'select' },
      ]
    }
  ];

  return (
    <div className="container mx-auto px-6 py-20 max-w-[800px]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-10"
      >
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-2xl shadow-primary/10">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-text-primary">System Settings</h2>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.3em] mt-1">SafeWalk Neural Configuration</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="neon-button text-text-primary px-8 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20"
          >
            Save Changes
          </button>
        </div>

        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-success/10 border border-success/20 text-success p-5 rounded-2xl text-sm flex items-center gap-4 shadow-xl shadow-success/5"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 font-medium">{success}</span>
              <button onClick={() => setSuccess(null)} className="p-2 hover:bg-success/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-10">
          {settingsGroups.map((group, idx) => (
            <div key={idx} className="space-y-6">
              <h3 className="text-[11px] font-black text-text-secondary uppercase tracking-[0.4em] ml-2">{group.title}</h3>
              <div className="grid gap-4">
                {group.items.map((item) => (
                  <div key={item.id} className="glass-card p-6 flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-secondary-bg/30 rounded-2xl flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors border border-glass-border">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary tracking-tight">{item.label}</div>
                        <div className="text-[10px] text-text-secondary mt-1 font-medium tracking-wide">{item.desc}</div>
                      </div>
                    </div>
                    
                    {item.type === 'select' ? (
                      <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors">
                        Manage <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => item.setter(!item.active)}
                        className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${item.active ? 'bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-secondary-bg/50'}`}
                      >
                        <div className={`w-6 h-6 bg-text-primary rounded-full shadow-lg transition-transform duration-300 ${item.active ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-10 border-t border-glass-border">
          <div className="glass-card p-8 border-error/20 bg-error/5 flex items-center justify-between group hover:border-error/40 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center text-error border border-error/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary tracking-tight">Danger Zone</div>
                <div className="text-[10px] text-text-secondary mt-1 font-medium tracking-wide">Permanently delete your account and all neural data</div>
              </div>
            </div>
            <button className="bg-error/10 hover:bg-error text-error hover:text-text-primary px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-error/20">
              Delete Account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
