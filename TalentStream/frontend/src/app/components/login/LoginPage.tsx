import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Fingerprint, 
  Shield, 
  Zap, 
  ShieldCheck,
  Mail,
  Lock,
  EyeOff,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../services/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
        if (email === 'rmg@kpit.com' && password === 'rmg') {
            await handleDemoLogin('RMG');
        } else if (email === 'pm@kpit.com' && password === 'pm') {
            await handleDemoLogin('Program_Mgr');
        } else if (email && password) {
            await login({ username: email, password: password });
            navigate('/dashboard');
        } else {
            // Default Demo Bypass for development
            handleDemoLogin('Admin');
        }
    } catch (err: any) {
        setError(err.response?.data?.detail || 'Authentication failed. Neural Link severed.');
        setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: string) => {
    setIsLoading(true);
    let roleName = role;
    let demoEmail = `${role.toLowerCase()}@ResourceStream.ai`;
    if (role === 'Program_Mgr') roleName = 'PM User';
    if (role === 'Project_Mgr') roleName = 'PM User';
    if (role === 'Admin') roleName = 'Admin User';
    if (role === 'RMG') roleName = 'RMG User';
    if (role === 'VP') roleName = 'VP User';

    // Standard UUIDs for demo roles to satisfy database UUID types
    const DEMO_IDS: Record<string, string> = {
      'Admin': '00000000-0000-4000-8000-000000000001',
      'VP': '00000000-0000-4000-8000-000000000002',
      'Program_Mgr': '00000000-0000-4000-8000-000000000003',
      'Project_Mgr': '00000000-0000-4000-8000-000000000004',
      'RMG': '00000000-0000-4000-8000-000000000005'
    };

    try {
      await login({ 
        demoUser: { 
          id: DEMO_IDS[role] || role, 
          email: demoEmail, 
          name: roleName, 
          role: role as any 
        } 
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center font-inter overflow-hidden relative bg-[#03070C]" 
      style={{ color: 'white' }}
    >
      
      {/* Background Ambience to match Landing Page mesh-bg */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-sky-600/10 rounded-full mix-blend-screen filter blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-violet-600/10 rounded-full mix-blend-screen filter blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[600px] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[150px]" />
      </div>

      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="w-full max-w-[420px] p-8 shadow-2xl relative z-10 bg-gray-900/40 backdrop-blur-2xl border border-slate-50/5 rounded-3xl hover:border-slate-50/10 transition-colors duration-500"
      >
         {/* Header */}
         <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                  <svg className="w-5 h-5 text-slate-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
               </div>
               <span className="text-xl font-semibold tracking-tight" style={{ color: 'white' }}>ResourceStream</span>
            </div>
            <h2 className="text-[15px] font-medium mb-1" style={{ color: '#94a3b8' }}>Welcome back to</h2>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'white' }}>ResourceStream Precision</h1>
         </div>

         <form onSubmit={handleLogin} className="space-y-5">
            {error && (
               <div className="p-3 rounded-xl text-xs font-semibold" style={{ background: 'rgba(225, 29, 72, 0.1)', color: '#f43f5e', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                  {error}
               </div>
            )}

            <div className="space-y-2">
               <label className="text-xs font-medium pl-1" style={{ color: '#cbd5e1' }}>Email</label>
               <div className="relative group/field">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px]" style={{ color: '#64748b' }} />
                  <input 
                     type="email" 
                     placeholder="Email Address" 
                     className="w-full rounded-[14px] pl-11 pr-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-500 bg-gray-950/50 border border-slate-50/10 text-slate-50"
                     onChange={(e) => setEmail(e.target.value)}
                     value={email}
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-medium pl-1" style={{ color: '#cbd5e1' }}>Password</label>
               <div className="relative group/field">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px]" style={{ color: '#64748b' }} />
                  <input 
                     type="password" 
                     placeholder="Password" 
                     className="w-full rounded-[14px] pl-11 pr-11 py-3.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-500 bg-gray-950/50 border border-slate-50/10 text-slate-50"
                     onChange={(e) => setPassword(e.target.value)}
                     value={password}
                  />
                  <EyeOff className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] cursor-pointer hover:opacity-80" style={{ color: '#64748b' }} />
               </div>
               <div className="flex justify-end pt-1">
                  <a href="#" className="text-[13px] font-medium hover:opacity-80 transition-colors" style={{ color: '#6366f1' }}>Forgot Password?</a>
               </div>
            </div>

            <button 
               type="submit"
               disabled={isLoading}
               className="group relative w-full mt-4 py-3.5 rounded-[14px] text-[15px] font-semibold text-slate-50 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] bg-sky-600 shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
               <div className="relative z-10 flex items-center justify-center gap-2">
               {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
               ) : (
                  <>
                     <LogIn className="w-4 h-4" />
                     Sign In
                  </>
               )}
               </div>
            </button>
         </form>

         <div className="mt-6 text-center text-[13px] font-medium" style={{ color: '#94a3b8' }}>
            Don't have an account? <a href="#" className="hover:underline" style={{ color: '#6366f1' }}>Sign Up</a>
         </div>

         <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
               <div className="w-full border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}></div>
            </div>
            <div className="relative px-4 text-[13px] font-medium" style={{ color: '#94a3b8', background: 'transparent' }}>
               <span style={{ background: '#13131f', padding: '0 12px', borderRadius: '100px' }}>Or continue with</span>
            </div>
         </div>

         <div className="mt-8 flex justify-center gap-5">
            <button 
               type="button"
               className="w-[46px] h-[46px] rounded-full flex items-center justify-center hover:bg-white/5 transition-all"
               style={{ border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent' }}
            >
               <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </button>
            <button 
               type="button"
               className="w-[46px] h-[46px] rounded-full flex items-center justify-center hover:bg-white/5 transition-all"
               style={{ border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent' }}
            >
               <svg className="w-[16px] h-[16px]" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
            </button>
            <button 
               type="button"
               className="w-[46px] h-[46px] rounded-full flex items-center justify-center hover:bg-white/5 transition-all"
               style={{ border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent' }}
            >
               <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            </button>
         </div>

      </motion.div>
    </div>
  );
}
