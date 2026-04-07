
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const VoiceAssistant = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const current = event.resultIndex;
        const trans = event.results[current][0].transcript;
        setTranscript(trans);
        
        if (event.results[current].isFinal) {
          handleCommand(trans.toLowerCase());
        }
      };

      rec.onend = () => setIsListening(false);
      rec.onerror = (event) => {
        if (event.error === 'no-speech') {
          // Silently handle no-speech to avoid UI noise
          setIsListening(false);
          return;
        }
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert("Microphone access was denied. Please enable it in your browser settings and ensure the app has permission.");
        }
      };
      setRecognition(rec);
    }
  }, []);

  const handleCommand = (command) => {
    console.log("Voice Command:", command);
    if (command.includes("sos") || command.includes("emergency")) {
      onCommand("SOS");
    } else if (command.includes("safe") || command.includes("route")) {
      onCommand("SAFE_ROUTE");
    } else if (command.includes("report")) {
      onCommand("REPORT");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  };

  if (!recognition) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[2000]">
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 bg-dark-bg/90 backdrop-blur-xl border border-glass-border p-4 rounded-2xl w-64 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Listening...</span>
            </div>
            <p className="text-xs text-text-primary italic">"{transcript || 'Say something...'}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={toggleListening}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${isListening ? 'bg-error text-text-primary scale-110' : 'bg-primary text-dark-bg hover:scale-105'}`}
      >
        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>
    </div>
  );
};
