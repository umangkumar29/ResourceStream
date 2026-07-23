import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

export default function LegalPage() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 text-slate-50 font-inter selection:bg-sky-500 selection:text-slate-50">
            {/* Header */}
            <nav className="fixed top-0 w-full z-50 border-b bg-gray-950/80 backdrop-blur-xl border-slate-50/10 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                            <svg className="w-5 h-5 text-slate-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <span className="font-display font-bold text-xl tracking-tight text-slate-50">ResourceStream</span>
                    </Link>
                    <div className="hidden md:flex items-center space-x-8">
                        <Link to="/" className="text-sm font-medium text-gray-400 hover:text-slate-50 transition-colors">Home</Link>
                        <a href="/login" className="bg-sky-500 hover:bg-sky-400 text-slate-50 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]">Login</a>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10">
                <div className="text-center mb-20 animate-fade-in-up">
                    <h1 className="text-5xl font-display font-extrabold tracking-tight mb-6 text-slate-50">
                        Terms of Service
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Enterprise licensing agreements, SLA commitments, and operational liability.
                    </p>
                </div>

                <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
                    <div className="prose prose-invert prose-sky max-w-none text-gray-300 leading-relaxed space-y-6">
                        <h2 className="text-2xl font-bold text-white mb-4">1. License Grant</h2>
                        <p>Subject to these terms, ResourceStream Inc. grants your enterprise a non-exclusive, non-transferable license to access the ResourceStream matching engine, vector indexing modules, and real-time dashboard UI. You may not decompile or attempt to reverse-engineer our proprietary scoring algorithms.</p>

                        <h2 className="text-2xl font-bold text-white mt-10 mb-4">2. Liability Limits regarding AI Decisions</h2>
                        <p>ResourceStream provides semantic analytics as an assistive tool to Project Managers and RMG teams. Our multi-agent LLM framework calculates probabilistic "Gap Analysis" and fit metrics. However, human administrators make all final hiring and allocation decisions. We are not legally liable for hiring outcomes.</p>

                        <h2 className="text-2xl font-bold text-white mt-10 mb-4">3. High-Availability SLA</h2>
                        <p>For Enterprise tier deployments using robust asynchronous broker protocols (RabbitMQ) mapped against SSD-backed pgvector instances, we guarantee 99.9% uptime. Compensation for SLA violation is outlined strictly in individual Enterprise contracts.</p>
                        
                        <div className="mt-12 bg-sky-900/10 border border-sky-500/20 rounded-xl p-6">
                            <p className="text-sky-300 text-sm">
                                By accessing the platform, users agree to adhere to these terms.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
