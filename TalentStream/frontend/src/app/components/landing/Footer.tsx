import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="border-t border-gray-800 bg-gray-950 pt-16 pb-8 relative z-10 font-inter text-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand / Logo */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                                <svg className="w-4 h-4 text-slate-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <span className="font-display font-bold tracking-tight text-slate-50 text-xl">ResourceStream</span>
                        </div>
                        <p className="text-gray-400 leading-relaxed max-w-xs">
                            AI-driven semantic talent matching and unified resource management. Eliminate bench downtime and instantly deploy the perfect professionals.
                        </p>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-slate-50 font-bold mb-6">Legal</h4>
                        <ul className="space-y-4">
                            <li><Link to="/privacy" className="text-gray-400 hover:text-slate-50 transition-colors block w-fit">Privacy Policy</Link></li>
                            <li><Link to="/legal" className="text-gray-400 hover:text-slate-50 transition-colors block w-fit">Terms of Service</Link></li>
                        </ul>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="text-slate-50 font-bold mb-6">Product</h4>
                        <ul className="space-y-4">
                            <li><a href="/#features" className="text-gray-400 hover:text-slate-50 transition-colors block w-fit">Features</a></li>
                            <li><Link to="/why" className="text-gray-400 hover:text-slate-50 transition-colors block w-fit">Why ResourceStream?</Link></li>
                            <li><a href="/#stats" className="text-gray-400 hover:text-slate-50 transition-colors block w-fit">Telemetry</a></li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h4 className="text-slate-50 font-bold mb-6">Connect</h4>
                        <ul className="space-y-4">
                            <li>
                                <a href="https://github.com/umangkumar29/TalentStream" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-slate-50 transition-colors flex items-center gap-2 w-fit">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.28-3.315.72-4.02-1.425-4.02-1.425-.545-1.38-1.335-1.755-1.335-1.755-1.095-.75.09-.735.09-.735 1.215.09 1.86 1.26 1.86 1.26 1.08 1.845 2.835 1.305 3.525.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.78.84 1.23 1.92 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a href="https://www.linkedin.com/in/umangkumar29" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-slate-50 transition-colors flex items-center gap-2 w-fit">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                    LinkedIn
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500">© 2026 Umang Kumar. &nbsp;·&nbsp; License</p>
                    <p className="text-gray-500">Made with <span className="text-red-500">❤️</span> by <strong className="text-slate-50 font-semibold">Umang Kumar</strong></p>
                </div>
            </div>
        </footer>
    );
}
