import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  PhoneCall, 
  User, 
  ChevronRight,
  MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType, getTimestampMillis } from '../lib/utils';
import { useLiveLocationReceiver } from '../extensions/FrontendExtensions';
import { ChangeView } from '../components/MapControls';

const TrackingPage = ({ user }) => {
  const { userId } = useParams();
  const [alert, setAlert] = useState(null);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]);
  const [isResolving, setIsResolving] = useState(false);

  const liveLocation = useLiveLocationReceiver(userId);

  useEffect(() => {
    if (liveLocation && typeof liveLocation[0] === 'number' && typeof liveLocation[1] === 'number') {
      setMapCenter(prev => {
        if (!prev) return liveLocation;
        const dLat = Math.abs(prev[0] - liveLocation[0]);
        const dLng = Math.abs(prev[1] - liveLocation[1]);
        if (dLat > 0.0001 || dLng > 0.0001) return liveLocation;
        return prev;
      });
    }
  }, [liveLocation]);

  useEffect(() => {
    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => getTimestampMillis(b.timestamp) - getTimestampMillis(a.timestamp));
        const data = docs[0];
        setAlert(data);
        const newCenter = [data.lat, data.lng];
        setMapCenter(prev => {
          if (!prev) return newCenter;
          const dLat = Math.abs(prev[0] - newCenter[0]);
          const dLng = Math.abs(prev[1] - newCenter[1]);
          if (dLat > 0.0001 || dLng > 0.0001) return newCenter;
          return prev;
        });
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
            {(liveLocation && typeof liveLocation[0] === 'number' && typeof liveLocation[1] === 'number') || (alert.lat && alert.lng) ? (
              <Marker position={(liveLocation && typeof liveLocation[0] === 'number' && typeof liveLocation[1] === 'number') ? liveLocation : [alert.lat, alert.lng]}>
                <Popup>
                  <div className="text-xs font-bold">{alert.name} is here</div>
                  {liveLocation && <div className="text-[10px] text-success font-bold uppercase mt-1">Live Tracking Active</div>}
                </Popup>
              </Marker>
            ) : null}
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

export default TrackingPage;
