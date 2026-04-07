import React, { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { 
  Plus, 
  Minus, 
  Locate, 
  Layers as LayersIcon, 
  Car, 
  Bike, 
  Bus, 
  Accessibility as Walking,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center[0] === 'number' && typeof center[1] === 'number' && !isNaN(center[0]) && !isNaN(center[1])) {
      const currentCenter = map.getCenter();
      const [lat, lng] = center;
      // Use a small threshold to avoid floating point issues
      const diffLat = Math.abs(currentCenter.lat - lat);
      const diffLng = Math.abs(currentCenter.lng - lng);
      
      if (diffLat > 0.0001 || diffLng > 0.0001) {
        map.setView(center, zoom || map.getZoom());
      }
    }
  }, [center, zoom, map]);
  return null;
};

export const MapControls = ({ onRecenter }) => {
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

export const UnifiedMapControl = ({ mapType, setMapType, travelMode, setTravelMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mapTypes = [
    { id: 'roadmap', label: 'Roadmap', icon: <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/40" /> },
    { id: 'satellite', label: 'Satellite', icon: <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/40" /> },
    { id: 'terrain', label: 'Terrain', icon: <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/40" /> },
    { id: 'hybrid', label: 'Hybrid', icon: <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/40" /> },
  ];

  const travelModes = [
    { id: 'car', label: 'Car', icon: <Car className="w-4 h-4" /> },
    { id: 'bike', label: 'Bike', icon: <Bike className="w-4 h-4" /> },
    { id: 'bus', label: 'Bus', icon: <Bus className="w-4 h-4" /> },
    { id: 'walk', label: 'Walk', icon: <Walking className="w-4 h-4" /> },
  ];

  return (
    <div className="absolute top-6 right-20 z-[1000]" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 rounded-2xl bg-card-bg/80 backdrop-blur-md border border-glass-border shadow-2xl transition-all ${isOpen ? 'bg-primary text-dark-bg border-primary' : 'text-text-primary hover:bg-secondary-bg/50'}`}
        title="Map Settings"
      >
        <LayersIcon className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-3 w-56 bg-card-bg/95 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl overflow-hidden p-2 flex flex-col gap-4"
          >
            <div>
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Map Type</div>
              <div className="flex flex-col gap-1 mt-1">
                {mapTypes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setMapType(t.id)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${mapType === t.id ? 'bg-primary text-dark-bg' : 'text-text-secondary hover:text-text-primary hover:bg-secondary-bg/50'}`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-glass-border/50 pt-2">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Travel Mode</div>
              <div className="flex flex-col gap-1 mt-1">
                {travelModes.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setTravelMode(m.id)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${travelMode === m.id ? 'bg-primary text-dark-bg' : 'text-text-secondary hover:text-text-primary hover:bg-secondary-bg/50'}`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SearchControl = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!query) return;
    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await resp.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="absolute top-6 left-20 z-[1000] w-full max-w-[300px]">
      <form onSubmit={search} className="relative group">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search places..."
          className="w-full bg-card-bg/80 backdrop-blur-md border border-glass-border rounded-2xl p-4 pl-12 text-sm text-text-primary focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-2xl"
        />
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary transition-colors" />
        {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </form>
      {results.length > 0 && (
        <div className="mt-2 bg-card-bg/90 backdrop-blur-md border border-glass-border rounded-2xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                const lat = parseFloat(r.lat);
                const lon = parseFloat(r.lon);
                if (!isNaN(lat) && !isNaN(lon)) {
                  onSelect([lat, lon], r.display_name);
                  setResults([]);
                  setQuery('');
                }
              }}
              className="w-full text-left p-4 hover:bg-secondary-bg/50 transition-colors border-b border-glass-border/50 last:border-0"
            >
              <div className="text-xs font-bold text-text-primary truncate">{r.display_name}</div>
              <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-widest">{r.type}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
