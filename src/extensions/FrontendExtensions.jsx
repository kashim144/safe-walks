import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, Shield, AlertTriangle, Activity, 
  TrendingUp, Map as MapIcon, Brain, 
  Navigation, Info, X, CheckCircle,
  Battery, MessageSquare, Star
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { io } from 'socket.io-client';

// --- Feature 5: Voice-Activated SOS ---
export const VoiceSOS = ({ onTrigger }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        console.log("[Voice] Command detected:", command);
        if (command.includes('help') || command.includes('sos') || command.includes('emergency')) {
          onTrigger();
        }
      };

      recognitionRef.current.onerror = (event) => {
        if (event.error === 'no-speech') {
          setIsListening(false);
          return;
        }
        console.error("[Voice] Error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [onTrigger]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  return (
    <button 
      onClick={toggleListening}
      className={`p-4 rounded-full transition-all ${isListening ? 'bg-error text-white animate-pulse' : 'bg-secondary-bg/50 text-text-secondary hover:bg-primary/20 hover:text-primary'}`}
      title={isListening ? "Listening for 'Help' or 'SOS'..." : "Enable Voice SOS"}
    >
      <Mic className="w-6 h-6" />
    </button>
  );
};

// --- Feature 7: Auto SOS Detection (Fall Detection Simulation) ---
export const FallDetection = ({ onTrigger }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    let timer;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      onTrigger();
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, onTrigger]);

  const simulateFall = () => {
    if (!isEnabled) return;
    setCountdown(10); // 10 second window to cancel
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Auto SOS</span>
        <span className="text-xs font-medium">{isEnabled ? 'Active' : 'Disabled'}</span>
      </div>
      <button 
        onClick={() => setIsEnabled(!isEnabled)}
        className={`w-12 h-6 rounded-full transition-all relative ${isEnabled ? 'bg-primary' : 'bg-secondary-bg'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEnabled ? 'left-7' : 'left-1'}`} />
      </button>
      {isEnabled && (
        <button 
          onClick={simulateFall}
          className="px-3 py-1 bg-error/10 text-error text-[10px] font-bold rounded-lg border border-error/20 hover:bg-error/20 transition-all"
        >
          Simulate Fall
        </button>
      )}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[5000] flex items-center justify-center bg-dark-bg/80 backdrop-blur-xl"
          >
            <div className="glass-card p-10 max-w-md text-center border-error/50">
              <AlertTriangle className="w-16 h-16 text-error mx-auto mb-6 animate-bounce" />
              <h2 className="text-3xl font-black mb-4">Fall Detected!</h2>
              <p className="text-text-secondary mb-8">Triggering SOS in <span className="text-error font-black text-2xl">{countdown}</span> seconds if not cancelled.</p>
              <button 
                onClick={() => setCountdown(null)}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20"
              >
                I'm Safe - Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Feature 6: AI Safety Assistant ---
export const AISafetyAssistant = ({ routes, alerts }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSafety = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        As a Safety AI Assistant, analyze the following data:
        Recent Alerts: ${JSON.stringify(alerts.slice(0, 5))}
        User Routes: ${JSON.stringify(routes.slice(0, 3))}
        
        Provide:
        1. A safety summary of the current area.
        2. 3 specific safety tips for the user's common routes.
        3. Identify any "high-risk" zones based on alert density.
        
        Return the response in a structured JSON format with fields: summary, tips (array), and riskZones (array).
      `;

      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      setAnalysis(JSON.parse(result.text));
    } catch (err) {
      console.error("[AI] Error analyzing safety:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="glass-card p-6 border-accent/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl text-accent">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest">AI Safety Insights</h3>
        </div>
        <button 
          onClick={analyzeSafety}
          disabled={isAnalyzing}
          className="text-[10px] font-bold text-accent hover:underline disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {analysis ? (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">{analysis.summary}</p>
          <div className="grid grid-cols-1 gap-2">
            {analysis.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-secondary-bg/30 rounded-lg border border-glass-border">
                <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                <span className="text-[10px] font-medium">{tip}</span>
              </div>
            ))}
          </div>
          {analysis.riskZones && analysis.riskZones.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-error mb-2">High Risk Zones Identified</div>
              <div className="space-y-2">
                {analysis.riskZones.map((zone, i) => (
                  <div key={i} className="p-3 rounded-xl bg-error/5 border border-error/20 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-error" />
                    <span className="text-[10px] font-bold text-text-primary">{zone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-[10px] text-text-secondary italic">Click refresh to get AI-powered safety insights for your area.</p>
        </div>
      )}
    </div>
  );
};

// --- Feature 8: Analytics & Heatmap Module ---
export const AnalyticsDashboard = ({ alerts }) => {
  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved').length;
  
  // Simple risk calculation
  const riskScore = Math.min(100, (activeAlerts * 20) + (alerts.length * 2));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-card p-6 border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Safety Index</span>
        </div>
        <div className="text-3xl font-black text-text-primary">{100 - riskScore}%</div>
        <div className="w-full h-1 bg-secondary-bg rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${100 - riskScore}%` }} />
        </div>
      </div>

      <div className="glass-card p-6 border-error/20">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-error" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Active Alerts</span>
        </div>
        <div className="text-3xl font-black text-error">{activeAlerts}</div>
        <p className="text-[10px] text-text-secondary mt-2 font-medium">Requires immediate attention</p>
      </div>

      <div className="glass-card p-6 border-success/20">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-success" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Resolved Cases</span>
        </div>
        <div className="text-3xl font-black text-success">{resolvedAlerts}</div>
        <p className="text-[10px] text-text-secondary mt-2 font-medium">Successfully handled</p>
      </div>
    </div>
  );
};

// --- Feature 2: Live Location Tracking (Client Hook) ---
export const useLiveTracking = (userId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    socketRef.current = io();

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socketRef.current.emit("update_location", {
          userId,
          lat: latitude,
          lng: longitude
        });
      },
      (err) => console.error("[Tracking] Error:", err),
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socketRef.current?.disconnect();
    };
  }, [userId]);
};

// Hook to receive real-time location updates
export const useLiveLocationReceiver = (userId) => {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io();

    socket.on('location_update', (data) => {
      if (data.userId === userId && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setLocation([data.lat, data.lng]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return location;
};

// --- Feature 9: Low Battery Auto SOS ---
export const BatterySOS = ({ onTrigger }) => {
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isLow, setIsLow] = useState(false);

  useEffect(() => {
    if (!('getBattery' in navigator)) return;

    navigator.getBattery().then(battery => {
      const updateBattery = () => {
        const level = battery.level * 100;
        setBatteryLevel(level);
        if (level <= 10 && !isLow) {
          setIsLow(true);
          onTrigger();
        }
      };

      updateBattery();
      battery.addEventListener('levelchange', updateBattery);
      return () => battery.removeEventListener('levelchange', updateBattery);
    });
  }, [onTrigger, isLow]);

  if (batteryLevel === null || isNaN(batteryLevel)) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-bg/30 border border-glass-border">
      <Battery className={`w-3.5 h-3.5 ${batteryLevel <= 20 ? 'text-error animate-pulse' : 'text-success'}`} />
      <span className="text-[10px] font-bold">{Math.round(batteryLevel)}%</span>
    </div>
  );
};

// --- Feature 10: Offline SMS Backup ---
export const SMSBackup = ({ emergencyContact, location }) => {
  const sendSMS = () => {
    if (!emergencyContact) {
      alert("Please set an emergency contact in settings first.");
      return;
    }
    const message = `EMERGENCY SOS! I need help. My current location: https://www.google.com/maps?q=${location?.[0]},${location?.[1]}`;
    window.location.href = `sms:${emergencyContact}?body=${encodeURIComponent(message)}`;
  };

  return (
    <button 
      onClick={sendSMS}
      className="flex items-center gap-2 px-4 py-2 bg-secondary-bg/50 hover:bg-primary/20 text-text-primary rounded-xl border border-glass-border transition-all group"
    >
      <MessageSquare className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
      <span className="text-xs font-bold uppercase tracking-widest">SMS Backup</span>
    </button>
  );
};

// --- Feature 11: Route Review / Complaint System ---
export const RouteReviewModal = ({ isOpen, onClose, onSubmit, routeData }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-dark-bg/90 backdrop-blur-xl p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-md w-full border-primary/20"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Star className="text-primary w-5 h-5" />
            Route Feedback
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary-bg rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-text-secondary mb-6 leading-relaxed">
          How was your journey from <span className="text-text-primary font-bold">{routeData?.startAddr}</span> to <span className="text-text-primary font-bold">{routeData?.endAddr}</span>?
        </p>

        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button 
              key={star}
              onClick={() => setRating(star)}
              className={`p-2 transition-all ${rating >= star ? 'text-primary scale-110' : 'text-text-secondary opacity-30 hover:opacity-100'}`}
            >
              <Star className="w-8 h-8 fill-current" />
            </button>
          ))}
        </div>

        <textarea 
          placeholder="Any safety concerns or complaints about this route?"
          className="w-full bg-secondary-bg/30 border border-glass-border rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all h-32 mb-6 resize-none"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button 
          onClick={() => {
            onSubmit({ rating, comment });
            onClose();
          }}
          disabled={rating === 0}
          className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Review
        </button>
      </motion.div>
    </div>
  );
};
