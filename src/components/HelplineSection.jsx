import React from 'react';
import { motion } from 'motion/react';
import { PhoneCall, Shield } from 'lucide-react';

const HelplineSection = () => {
  const helplines = [
    { name: "Police Emergency", number: "100" },
    { name: "Ambulance", number: "102" },
    { name: "Fire Emergency", number: "101" },
    { name: "Women Helpline", number: "1091" },
    { name: "Women Emergency", number: "181" },
    { name: "Child Helpline", number: "1098" }
  ];

  return (
    <section className="py-24 bg-dark-bg/30 border-t border-glass-border/60">
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-text-primary tracking-tight">Emergency Helplines</h2>
          <p className="text-text-secondary text-lg">Quick access to essential emergency services.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {helplines.map((h, i) => (
            <motion.a 
              key={i} 
              href={`tel:${h.number}`}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass-card p-8 text-center hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <PhoneCall className="w-5 h-5 text-primary" />
              </div>
              <div className="text-[11px] font-bold text-text-secondary uppercase mb-2 tracking-[0.2em] group-hover:text-text-primary transition-colors">{h.name}</div>
              <div className="text-xl font-bold text-primary group-hover:scale-110 transition-transform">{h.number}</div>
            </motion.a>
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-8 glass-card border border-primary/20 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary">Cyber Crime Helpline</h3>
              <p className="text-text-secondary text-sm">Report cyber crimes and online harassment instantly.</p>
            </div>
          </div>
          <a 
            href="tel:1930"
            className="neon-button text-text-primary px-10 py-4 rounded-[16px] font-bold text-xl transition-all flex items-center gap-3"
          >
            <PhoneCall className="w-6 h-6" /> 1930
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default HelplineSection;
