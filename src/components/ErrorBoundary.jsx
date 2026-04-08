import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'motion/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    // Removed reload to prevent infinite loop - just reset state
    console.log('ErrorBoundary: Resetting error state without reload');
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      let userMessage = "Something went wrong. Our team has been notified.";
      
      // Try to parse userMessage from our custom error objects
      if (this.state.error?.userMessage) {
        userMessage = this.state.error.userMessage;
      } else {
        try {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('permission-denied')) {
            userMessage = "You don't have permission to perform this action. Please check your account settings.";
          }
        } catch (e) {
          // Not our custom JSON error
        }
      }

      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6 font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-card-bg border border-white/10 p-8 rounded-[32px] shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h1>
            <p className="text-text-secondary mb-8 leading-relaxed">
              {userMessage}
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleReset}
                className="w-full bg-primary text-black font-bold py-4 rounded-[16px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              
              <a 
                href="/"
                className="w-full bg-white/5 text-text-primary font-bold py-4 rounded-[16px] flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </a>
            </div>
            
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="mt-8 text-left">
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-2">Error Details (Dev Only)</p>
                <pre className="bg-black/40 p-4 rounded-[12px] text-[10px] text-red-400 overflow-auto max-h-40 font-mono">
                  {this.state.error.toString()}
                  {"\n\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
