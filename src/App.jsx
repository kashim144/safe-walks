import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { AlertTriangle, Copy } from 'lucide-react';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './lib/utils';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import TrackingPage from './pages/TrackingPage';
import AdminPage from './pages/AdminPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('offline')) {
            setConnectionError('offline');
          } else if (error.message.includes('permission-denied')) {
            setConnectionError('permission');
          }
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { 
              id: firebaseUser.uid, 
              email: firebaseUser.email, // Ensure email is from auth if missing in doc
              ...userDoc.data() 
            };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // Check for demo user in local storage if doc doesn't exist yet
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            } else {
              // Create a basic user object from auth if no doc exists yet
              const userData = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                role: 'user'
              };
              setUser(userData);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        // Check for demo user
        const storedUser = localStorage.getItem('user');
        if (storedUser && JSON.parse(storedUser).id === 'demo-user-123') {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const copyRulesToClipboard = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    match /test/{docId} {
      allow read: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rules).then(() => {
      alert("Security Rules copied! Paste these in your Firebase Console and click Publish.");
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || 
                  user?.email?.toLowerCase() === 'valism619@gmail.com' || 
                  user?.email?.toLowerCase() === 'shaikking032@gmail.com' ||
                  user?.name?.toLowerCase().includes('khasim basha shaik');

  return (
    <Router>
      <div className="min-h-screen bg-dark-bg text-text-primary selection:bg-primary/30 bg-animated-gradient">
        {connectionError && (
          <div className={`fixed top-0 left-0 right-0 z-[9999] backdrop-blur-md text-white p-4 text-center text-sm font-bold animate-pulse flex items-center justify-center gap-3 ${connectionError === 'offline' ? 'bg-error/90' : 'bg-warning/90'}`}>
            <AlertTriangle className="w-5 h-5" />
            <span>
              {connectionError === 'offline' 
                ? "Firestore is Offline! Please create a Firestore database in your Firebase Console."
                : "Firestore Permission Denied! Please update your Security Rules."}
            </span>
            <button 
              onClick={copyRulesToClipboard}
              className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy Rules
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="particle-bg" />
        <Navbar user={user} onLogout={handleLogout} />
        
        <main className="min-h-[calc(100-80px)]">
          <Routes>
            <Route path="/" element={<HomePage onLogin={setUser} />} />
            <Route path="/register" element={<RegisterPage onLogin={setUser} />} />
            <Route path="/login" element={<LoginPage onLogin={setUser} />} />
            <Route path="/dashboard" element={user ? <DashboardPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <ProfilePage user={user} onUpdate={setUser} /> : <Navigate to="/login" />} />
            <Route path="/settings" element={user ? <SettingsPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/track/:userId" element={<TrackingPage user={user} />} />
            <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
