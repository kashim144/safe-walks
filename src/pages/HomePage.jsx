import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Navigation, 
  AlertTriangle, 
  MapPin, 
  LayoutDashboard, 
  Zap, 
  Lock, 
  ChevronRight, 
  CheckCircle,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import HelplineSection from '../components/HelplineSection';

const HomePage = ({ onLogin }) => {
  const navigate = useNavigate();

  const handleDemo = () => {
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
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-[90vh] flex items-center py-24 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-error/5 rounded-full blur-[120px] -z-10" style={{ animationDelay: '2s' }} />
        
        <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-[11px] font-bold mb-8 border border-primary/20 tracking-[0.2em] uppercase">
              <Zap className="w-3.5 h-3.5" /> Next-Gen Safety
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-8 text-text-primary tracking-tight">
              Smart Safety <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Navigation</span>
            </h1>
            <p className="text-lg text-text-secondary mb-12 max-w-[480px] leading-relaxed">
              Real-time safest routes with smart risk assessment and instant SOS emergency protection. Walk with confidence, anywhere.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/register" className="neon-button text-text-primary px-10 py-4.5 rounded-xl font-bold transition-all flex items-center gap-3 group">
                Get Started <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={handleDemo}
                className="glass-card border border-glass-border hover:bg-secondary-bg/30 text-text-primary px-10 py-4.5 rounded-xl font-bold transition-all"
              >
                Try Demo
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass-card p-6 shadow-2xl relative z-10 overflow-hidden">
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-error/30" />
                  <div className="w-3 h-3 rounded-full bg-warning/30" />
                  <div className="w-3 h-3 rounded-full bg-success/30" />
                </div>
                <div className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase">Neuro_Glass_v3.0</div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-secondary-bg/50 p-6 rounded-2xl border border-glass-border/50">
                  <div className="text-text-secondary text-[10px] uppercase font-bold mb-2 tracking-widest">Active Users</div>
                  <div className="text-3xl font-bold text-text-primary">1,284</div>
                </div>
                <div className="bg-secondary-bg/50 p-6 rounded-2xl border border-glass-border/60">
                  <div className="text-text-secondary text-[10px] uppercase font-bold mb-2 tracking-widest">Safety Score</div>
                  <div className="text-3xl font-bold text-primary">98.2%</div>
                </div>
              </div>
              <div className="h-[340px] bg-secondary-bg/50 rounded-2xl flex items-center justify-center text-text-secondary border border-glass-border/60 overflow-hidden relative">
                 <img src="https://picsum.photos/seed/map/800/600" alt="Map Preview" className="w-full h-full object-cover opacity-20 grayscale" referrerPolicy="no-referrer" />
                 <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 to-transparent" />
                 <div className="absolute bottom-6 left-6 right-6 p-4 glass-card border-glass-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--color-primary)]" />
                      <div className="text-[11px] font-bold text-text-primary tracking-widest uppercase">Live_Tracking_Active</div>
                    </div>
                 </div>
              </div>
            </div>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/15 rounded-full blur-[80px] -z-10" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-accent/10 rounded-full blur-[80px] -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-text-primary tracking-tight">Advanced Safety Features</h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">Everything you need to ensure personal safety during your daily commute or late-night walks.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: <Navigation className="text-primary w-7 h-7" />, title: "Safe Route Intelligence", desc: "Smart route calculation focusing on well-lit and populated paths." },
              { icon: <AlertTriangle className="text-error w-7 h-7" />, title: "Real-time SOS Alert", desc: "Instant emergency notification to admin and contacts with live location." },
              { icon: <MapPin className="text-primary w-7 h-7" />, title: "Live Location Tracking", desc: "Continuous GPS monitoring to ensure you're always on the right path." },
              { icon: <LayoutDashboard className="text-primary w-7 h-7" />, title: "Admin Monitoring", desc: "Centralized dashboard for security teams to manage active alerts." },
              { icon: <Zap className="text-primary w-7 h-7" />, title: "Lightweight Architecture", desc: "Fast, efficient, and works even on low-bandwidth connections." },
              { icon: <Lock className="text-primary w-7 h-7" />, title: "Privacy Focused", desc: "Your data is encrypted and only shared during active emergencies." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -8 }}
                className="glass-card p-10 hover:border-primary/20 group"
              >
                <div className="w-16 h-16 bg-secondary-bg/30 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary/10 transition-colors border border-glass-border/60">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-4 text-text-primary tracking-tight">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 bg-secondary-bg/10 border-y border-glass-border/60">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-text-primary tracking-tight">How It Works</h2>
            <p className="text-text-secondary text-lg">Four simple steps to a safer journey.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-12">
            {[
              { step: "01", title: "Register Account", desc: "Create your profile and add emergency contacts." },
              { step: "02", title: "Enter Destination", desc: "Input where you want to go on our smart map." },
              { step: "03", title: "Get Safest Route", desc: "Follow the smart-calculated safest path home." },
              { step: "04", title: "Emergency SOS", desc: "One-tap alert if you feel unsafe at any point." }
            ].map((s, i) => (
              <div key={i} className="relative group">
                <div className="text-7xl font-black text-text-primary/5 mb-6 group-hover:text-primary/10 transition-colors tracking-tighter">{s.step}</div>
                <h3 className="text-xl font-bold mb-3 text-text-primary tracking-tight">{s.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                {i < 3 && <div className="hidden md:block absolute top-12 -right-6 text-text-primary/10"><ChevronRight className="w-8 h-8" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Route Feature Section */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-text-primary leading-tight">Smart Safe <br /> <span className="text-primary">Route Calculation</span></h2>
            <p className="text-text-secondary mb-8 leading-relaxed text-lg">
              Our proprietary algorithm analyzes real-time data including street lighting, historical incidents, and foot traffic to provide you with the safest possible walking path, not just the shortest one.
            </p>
            <ul className="space-y-4">
              {[
                "Well-lit street prioritization",
                "High-traffic area routing",
                "Real-time risk assessment"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-text-primary/80">
                  <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-primary w-3.5 h-3.5" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card border border-glass-border rounded-[32px] p-3 shadow-2xl overflow-hidden group">
            <div className="h-[400px] rounded-[24px] overflow-hidden relative">
              <img src="https://picsum.photos/seed/route/800/600" alt="Route Preview" className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* SOS Feature Section */}
      <section className="py-24 bg-error/5 border-y border-glass-border/50">
        <div className="container mx-auto px-6 max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 flex justify-center">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-56 h-56 bg-gradient-to-br from-error to-accent rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.4)] cursor-pointer relative z-10"
              >
                <span className="text-5xl font-black text-text-primary tracking-tighter">SOS</span>
              </motion.div>
              <div className="absolute -inset-6 border-2 border-error/20 rounded-full animate-ping" />
              <div className="absolute -inset-12 border border-error/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-error leading-tight">Instant Emergency <br /> Protection</h2>
            <p className="text-text-secondary mb-8 leading-relaxed text-lg">
              In any threatening situation, a single tap triggers a high-priority SOS alert. Your live location, profile details, and emergency contacts are immediately shared with our 24/7 monitoring team.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 text-error font-bold hover:gap-4 transition-all">
              Learn more about SOS protection <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="container mx-auto px-6 max-w-[800px]">
          <h2 className="text-4xl md:text-6xl font-black mb-10 text-text-primary tracking-tight leading-tight">Start using SafeWalk today</h2>
          <p className="text-text-secondary mb-12 text-xl leading-relaxed">Join thousands of users who trust SafeWalk for their daily safety. It's free, secure, and life-saving.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/register" className="neon-button text-text-primary px-12 py-5 rounded-xl font-bold text-lg transition-all">
              Create Free Account
            </Link>
            <button 
              onClick={handleDemo}
              className="glass-card border border-glass-border hover:bg-secondary-bg/30 text-text-primary px-12 py-5 rounded-xl font-bold text-lg transition-all"
            >
              Try Demo Mode
            </button>
          </div>
        </div>
      </section>

      <HelplineSection />
    </div>
  );
};

export default HomePage;
