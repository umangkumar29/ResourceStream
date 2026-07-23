import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DemoModePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 font-inter text-slate-50 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 blur-[100px] pointer-events-none rounded-full"></div>
            
            <div className="bg-gray-900/60 backdrop-blur-xl border border-slate-50/10 p-8 sm:p-12 rounded-3xl max-w-lg w-full text-center shadow-2xl relative z-10 animate-fade-in-up">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-6 border border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                
                <h1 className="text-3xl font-display font-bold mb-4 text-white">Portfolio Demo Mode</h1>
                
                <p className="text-gray-300 leading-relaxed mb-8 text-base">
                    This is a frontend architectural showcase. The enterprise backend (pgvector, RabbitMQ, Celery) and PostgreSQL databases are kept offline to protect proprietary data privacy.
                </p>
                <p className="text-gray-400 text-sm mb-8">
                    To run the full stack and access the interactive AI dashboard, please clone the GitHub repository and run the application locally via Docker.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-full bg-slate-50/10 hover:bg-slate-50/20 text-slate-50 transition-colors font-medium border border-slate-50/10 hover:scale-105 active:scale-95">
                        Back to Landing
                    </button>
                    <a href="https://github.com/umangkumar29/TalentStream" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-50 transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.28-3.315.72-4.02-1.425-4.02-1.425-.545-1.38-1.335-1.755-1.335-1.755-1.095-.75.09-.735.09-.735 1.215.09 1.86 1.26 1.86 1.26 1.08 1.845 2.835 1.305 3.525.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.78.84 1.23 1.92 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                        View Source Code
                    </a>
                </div>
            </div>
        </div>
    );
}
