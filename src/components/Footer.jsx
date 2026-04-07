import React from 'react';
import { Shield, Twitter, Facebook, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="py-24 border-t border-glass-border/50 bg-dark-bg/50">
      <div className="container mx-auto px-6 max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Shield className="text-primary w-5 h-5" />
          <span className="text-lg font-bold text-text-primary tracking-tight">SafeWalk</span>
        </div>
        <div className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} SafeWalk Technologies. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Twitter className="w-4 h-4 text-text-secondary hover:text-primary cursor-pointer transition-colors" />
          <Facebook className="w-4 h-4 text-text-secondary hover:text-primary cursor-pointer transition-colors" />
          <Github className="w-4 h-4 text-text-secondary hover:text-primary cursor-pointer transition-colors" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
