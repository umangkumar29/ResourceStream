import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from './Footer';
import './LandingPage.css';

export default function LandingPage() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    
    // Live mockup state
    const candidates = [
        { init: 'JS', name: 'John Smith', title: 'Senior React/AWS Developer • 6 YOE', score: '94% Fit', color: 'green', text: '"Candidate possesses strong overlap in core requirements, specifically with 4+ years of React experience and recent deployment of AWS serverless architectures. Notable strength in pgvector integration."' },
        { init: 'EA', name: 'Emily Adams', title: 'Full Stack Engineer • 5 YOE', score: '88% Fit', color: 'blue', text: '"Strong match on frontend technologies. Lacks direct AWS serverless experience, but possesses deep knowledge of Node.js and RESTful API design. Fast learner."' },
        { init: 'MR', name: 'Michael Ross', title: 'Backend Software Eng • 8 YOE', score: '81% Fit', color: 'yellow', text: '"Heavy experience with PostgreSQL and cloud architecture. Missing recent React experience on the frontend, but excellent fundamentals for backend microservices."' }
    ];
    const [mockIndex, setMockIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    const heroElementsRef = useRef<HTMLDivElement[]>([]);
    const revealElementsRef = useRef<HTMLDivElement[]>([]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        
        // Initial Hero Reveal
        heroElementsRef.current.forEach((el, i) => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                el.style.transitionDelay = `${0.2 + (i * 0.15)}s`;
                
                // Trigger reflow
                void el.offsetWidth;
                
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });

        // Intersection Observer for scroll reveals
        const observerOptions = {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target as HTMLElement;
                    target.style.opacity = '1';
                    target.style.transform = 'translateY(0) scale(1)';
                    observer.unobserve(target);
                }
            });
        }, observerOptions);

        revealElementsRef.current.forEach((el, index) => {
            if (el) {
                el.style.opacity = '0';
                el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                
                if (el.classList.contains('stat-item')) {
                    el.style.transform = 'scale(0.9)';
                    el.style.transitionDelay = `${(index % 3) * 150}ms`;
                } else if (el.classList.contains('feature-card')) {
                    el.style.transform = 'translateY(40px)';
                    el.style.transitionDelay = `${(index % 3) * 150}ms`;
                } else {
                    el.style.transform = 'translateY(30px)';
                }
                observer.observe(el);
            }
        });

        // Mockup cycling
        const interval = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setMockIndex((prev) => (prev + 1) % candidates.length);
                setIsTransitioning(false);
            }, 300);
        }, 5000);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(interval);
            observer.disconnect();
        };
    }, []);

    const handleStartFreeTrial = () => {
        navigate('/login');
    };

    const c = candidates[mockIndex];
    
    // Add refs
    const setHeroRef = (el: HTMLDivElement | null) => {
        if (el && !heroElementsRef.current.includes(el)) heroElementsRef.current.push(el);
    };
    const setRevealRef = (el: HTMLDivElement | null) => {
        if (el && !revealElementsRef.current.includes(el)) revealElementsRef.current.push(el);
    };

    return (
        <div className="landing-page-wrapper selection:bg-sky-500 selection:text-slate-50 font-inter">
            {/* Animated Background */}
            <div className="mesh-bg fixed">
                <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-sky-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{animationDuration: '12s'}}></div>
                <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-violet-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{animationDuration: '15s', animationDirection: 'alternate-reverse'}}></div>
                <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[600px] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[150px] animate-blob" style={{animationDuration: '18s'}}></div>
            </div>

            {/* Navigation */}
            <nav id="navbar" className={`fixed top-0 w-full z-50 transition-all duration-300 py-6 px-4 sm:px-6 lg:px-8 border-b ${scrolled ? 'bg-gray-950/80 backdrop-blur-xl border-slate-50/10' : 'border-transparent'}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="landing-glass-card rounded-2xl px-6 py-3 flex justify-between items-center transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                                <svg className="w-5 h-5 text-slate-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <span className="font-display font-bold text-xl tracking-tight text-slate-50">ResourceStream</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="/#features" className="text-sm font-medium text-gray-400 hover:text-slate-50 transition-colors">Features</a>
                            <a href="/#how-it-works" className="text-sm font-medium text-gray-400 hover:text-slate-50 transition-colors">How it Works</a>
                            <a href="/#stats" className="text-sm font-medium text-gray-400 hover:text-slate-50 transition-colors">Metrics</a>
                            <Link to="/why" className="text-sm font-bold text-slate-50 bg-sky-600 px-3 py-1 rounded transition-colors hover:bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]">Why ResourceStream?</Link>
                            <a href="https://github.com/umangkumar29/TalentStream" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-slate-50 transition-colors group">
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.28-3.315.72-4.02-1.425-4.02-1.425-.545-1.38-1.335-1.755-1.335-1.755-1.095-.75.09-.735.09-.735 1.215.09 1.86 1.26 1.86 1.26 1.08 1.845 2.835 1.305 3.525.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.78.84 1.23 1.92 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                                GitHub
                            </a>
                        </div>
                        <div className="flex items-center">
                            <button onClick={handleStartFreeTrial} className="bg-slate-50/10 hover:bg-slate-50/20 text-slate-50 px-5 py-2.5 rounded-full text-sm font-medium border border-slate-50/10 transition-all duration-300 hover:scale-105 active:scale-95">
                                Login
                            </button>
                            <button onClick={handleStartFreeTrial} className="ml-2 bg-sky-500 hover:bg-sky-400 text-slate-50 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:scale-105 active:scale-95">
                                Request Demo
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-48 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10 text-center min-h-screen flex flex-col justify-center">
                
                <div ref={setHeroRef} className="hero-element inline-flex items-center gap-2 px-4 py-1.5 rounded-full landing-glass-card border border-sky-500/30 text-sky-300 text-xs font-semibold uppercase tracking-wider mb-8 mx-auto">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-glow"></span>
                    Powered by pgvector & RabbitMQ
                </div>
                
                <h1 ref={setHeroRef} className="hero-element text-5xl md:text-7xl font-display font-extrabold tracking-tight mb-6 leading-tight text-slate-50">
                    Deploy the Right Talent, <br className="hidden md:block" />
                    <span className="text-gradient">Instantly with AI</span>
                </h1>
                
                <p ref={setHeroRef} className="hero-element text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Eliminate bench downtime. ResourceStream uses hybrid vector search and deep LLM evaluations to perfectly align open job requirements with your available workforce in milliseconds.
                </p>
                
                <div ref={setHeroRef} className="hero-element flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                    <button onClick={handleStartFreeTrial} className="group relative w-full sm:w-auto px-8 py-4 rounded-xl bg-sky-600 text-slate-50 font-semibold overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative z-10 flex items-center gap-2">
                            Start Matching Now
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </span>
                    </button>
                    <div 
                        onClick={() => navigator.clipboard.writeText('docker run -p 3000:3000 resourcestream/engine')}
                        className="w-full sm:w-auto px-6 py-4 rounded-xl bg-gray-900 border border-slate-50/10 font-mono text-sm flex items-center justify-between text-gray-300 gap-6 transition-all hover:border-slate-50/30 hover:bg-gray-800/80 cursor-pointer group shadow-lg"
                        title="Copy to clipboard"
                    >
                        <span>
                            <span className="text-gray-500 mr-3">{'>_'}</span>
                            <span className="text-orange-400">docker</span> run -p 3000:3000 resourcestream/engine
                        </span>
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-slate-50 opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                </div>

                {/* Live Mockup UI Container */}
                <div ref={setHeroRef} className="hero-element relative mx-auto max-w-5xl w-full perspective-1000 animate-float" style={{transformStyle: 'preserve-3d'}}>
                    {/* Ambient Glow */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-sky-500 to-violet-500 rounded-3xl blur-2xl opacity-20 hover:opacity-40 transition-opacity duration-500"></div>
                    
                    {/* Dashboard UI */}
                    <div className="relative landing-glass-card rounded-2xl p-1 shadow-2xl border-t border-l border-slate-50/20 bg-gray-900/60 backdrop-blur-2xl">
                        {/* Mac UI dots */}
                        <div className="px-4 py-3 flex gap-2 border-b border-slate-50/5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>

                        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-8">
                            
                            {/* Left: JD Input */}
                            <div className="flex-1 space-y-5 text-left border border-slate-50/5 rounded-xl p-5 bg-gray-950/50">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                    <span className="text-sm font-semibold text-gray-300 tracking-wide flex items-center gap-2">
                                        <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                        Target Role
                                    </span>
                                    <span className="text-[10px] text-sky-400 bg-sky-400/10 px-2 py-1 rounded font-medium border border-sky-400/20 uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                                        Vector Search
                                    </span>
                                </div>
                                <div className="space-y-3 relative overflow-hidden group p-2 -mx-2 rounded-lg">
                                    <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-transparent via-sky-500/20 to-transparent opacity-50 animate-scan pointer-events-none"></div>
                                    <h4 className="text-slate-50 font-semibold text-sm">Senior Full Stack Engineer</h4>
                                    <p className="text-gray-400 text-xs leading-relaxed">
                                        We are looking for an experienced developer to architect our new serverless microservices. Must have deep knowledge of React, Node.js, and the AWS ecosystem. Experience with PostgreSQL and vector databases is a huge plus.
                                    </p>
                                </div>
                                <div className="pt-2 flex flex-wrap gap-2">
                                    <div className="px-3 py-1 bg-slate-50/5 rounded-full text-[11px] font-medium text-slate-300 border border-slate-50/10 backdrop-blur-sm">React</div>
                                    <div className="px-3 py-1 bg-slate-50/5 rounded-full text-[11px] font-medium text-slate-300 border border-slate-50/10 backdrop-blur-sm">Node.js</div>
                                    <div className="px-3 py-1 bg-sky-500/10 rounded-full text-[11px] font-semibold text-sky-400 border border-sky-500/30 backdrop-blur-sm shadow-[0_0_10px_rgba(14,165,233,0.2)]">AWS Serverless</div>
                                </div>
                            </div>

                            {/* Middle: Pipeline Animation */}
                            <div className="flex items-center justify-center md:flex-col gap-2 py-4 md:py-0 relative">
                                {/* Connecting lines */}
                                <div className="w-full h-[1px] md:w-[1px] md:h-full bg-gray-800 absolute z-0"></div>
                                <div className="w-3 h-3 rounded-full bg-sky-500 z-10 shadow-[0_0_15px_#0ea5e9]"></div>
                                <div className="hidden md:flex flex-col gap-2 z-10 my-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400/50 animate-ping" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400/50 animate-ping" style={{animationDelay: '0.3s'}}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400/50 animate-ping" style={{animationDelay: '0.5s'}}></div>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-green-500 z-10 shadow-[0_0_15px_#22c55e]"></div>
                            </div>

                            {/* Right: Results */}
                            <div className="flex-1 space-y-4 text-left border border-slate-50/5 rounded-xl p-5 bg-gray-950/50">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                    <span className="text-sm font-semibold text-gray-300 tracking-wide flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Top Match Generated
                                    </span>
                                    <span className={`text-xs text-${c.color}-400 bg-${c.color}-400/10 px-2 py-1 rounded font-medium border border-${c.color}-400/20 shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all duration-300`} style={{ opacity: isTransitioning ? 0 : 1 }}>
                                        {c.score}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-4 relative overflow-hidden group" style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.3s' }}>
                                    <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center font-display font-bold text-gray-300 relative overflow-hidden shadow-lg">
                                        <div className="absolute inset-0 bg-green-500/10"></div>
                                        <span className="relative z-10 text-lg">{c.init}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-semibold text-slate-50">{c.name}</h4>
                                        <p className="text-xs text-gray-400">{c.title}</p>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-sky-900/10 rounded-xl border border-sky-500/20 relative overflow-hidden mt-4" style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.3s' }}>
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-500 to-violet-500"></div>
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-sky-500/10 to-transparent opacity-50 animate-scan pointer-events-none" style={{animationDelay: '1.5s'}}></div>
                                    <p className="text-[13px] text-gray-300 leading-relaxed font-medium">
                                        {c.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 relative z-10 border-t border-slate-50/5 bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div ref={setRevealRef} className="text-center mb-20 section-header">
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-slate-50">The Next Generation of <span className="text-sky-400">Resource Allocation</span></h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto">Stop reading resumes manually. Let advanced RAG architectures surface your perfect candidates automatically.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div ref={setRevealRef} className="feature-card landing-glass-card p-8 rounded-2xl border border-slate-50/5 hover:border-sky-500/30 transition-all duration-500 hover:-translate-y-2 group bg-gray-900/40">
                            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-sky-500/20 transition-all duration-500 border border-sky-500/20">
                                <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-50">Hybrid Search Engine</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Combines semantic vector search (via <code className="text-sky-300 bg-sky-500/10 px-1 py-0.5 rounded">pgvector</code>) with exact BM25 keyword matching. We retrieve candidates who not only match keywords, but conceptually possess the required skills.
                            </p>
                        </div>
                        
                        {/* Feature 2 */}
                        <div ref={setRevealRef} className="feature-card landing-glass-card p-8 rounded-2xl border border-slate-50/5 hover:border-violet-500/30 transition-all duration-500 hover:-translate-y-2 group bg-gray-900/40">
                            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-500 border border-violet-500/20">
                                <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-50">Deep LLM Evaluations</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Say goodbye to generic percentages. Our pipeline uses state-of-the-art LLMs to generate structured match insights, extracting exact evidence from the resume and instantly noting potential skill gaps.
                            </p>
                        </div>
                        
                        {/* Feature 3 */}
                        <div ref={setRevealRef} className="feature-card landing-glass-card p-8 rounded-2xl border border-slate-50/5 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2 group bg-gray-900/40">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500 border border-blue-500/20">
                                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-50">Asynchronous Architecture</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Process thousands of resumes in milliseconds. Powered by RabbitMQ, the matching pipeline runs silently in the background, updating PM dashboards in real-time via WebSockets.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section id="how-it-works" className="py-32 relative z-10 border-t border-slate-50/5 bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div ref={setRevealRef} className="text-center mb-20 section-header">
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-slate-50">How <span className="text-sky-400">ResourceStream</span> Works</h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto">Monitor and control your entire matching pipeline through a single, elegant interface powered by real-time microservices.</p>
                    </div>

                    {/* Animated Match Pipeline */}
                    <div ref={setRevealRef} className="relative mx-auto max-w-6xl rounded-3xl bg-gray-950/80 border border-slate-50/10 shadow-[0_0_60px_rgba(14,165,233,0.1)] p-6 sm:p-10 overflow-hidden font-inter">
                        {/* Glowing Background Core */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-sky-500/10 via-violet-500/10 to-green-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                        {/* Connecting Line (Desktop Only) */}
                        <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-800/50 -translate-y-1/2 z-0 hidden lg:block rounded-full overflow-hidden border border-slate-50/5">
                            <div className="h-full bg-gradient-to-r from-sky-500 via-violet-500 to-green-500 w-[200%] animate-scan opacity-50 relative pointer-events-none" style={{ animationDuration: '8s' }}></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative z-10">
                            {/* Step 1: Job Requisition Context */}
                            <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:border-sky-500/50 hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] group">
                                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-6 border border-sky-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-50 mb-3 tracking-tight">1. Ingest Job Reqs</h3>
                                <p className="text-sm text-gray-400 mb-8 leading-relaxed">Instantly parses job descriptions to extract required skills, core technical stacks, and domain constraints into a machine-readable query context.</p>
                                
                                {/* Animated Mock UI */}
                                <div className="space-y-3 bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded bg-sky-500 animate-pulse"></div>
                                        <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-widest">Parsing Structure</div>
                                    </div>
                                    <div className="h-2 w-3/4 bg-gray-800 rounded overflow-hidden">
                                        <div className="h-full bg-sky-500/50 w-full relative">
                                            <div className="absolute inset-0 bg-white/20 -translate-x-full animate-scan" style={{animationDuration: '2s'}}></div>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-gray-800 rounded"></div>
                                    <div className="h-2 w-5/6 bg-gray-800 rounded"></div>
                                    <div className="flex gap-2 pt-3">
                                        <div className="px-2.5 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-medium rounded border border-sky-500/20">TypeScript</div>
                                        <div className="px-2.5 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-medium rounded border border-sky-500/20">React</div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: pgvector Search */}
                            <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] group relative">
                                {/* Connecting Node Indicator */}
                                <div className="absolute -left-6 lg:-left-12 top-1/2 w-3 h-3 bg-violet-500 rounded-full -translate-y-1/2 hidden lg:block shadow-[0_0_15px_#8b5cf6]"></div>
                                
                                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-6 border border-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-50 mb-3 tracking-tight">2. Vector Mapping</h3>
                                <p className="text-sm text-gray-400 mb-8 leading-relaxed">Converts parsed requirements into deep embeddings, utilizing pgvector to instantly surface candidates with true semantic alignment.</p>
                                
                                {/* Animated Mock UI */}
                                <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded bg-violet-500 animate-ping"></div>
                                        <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-widest">Scanning Database</div>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 pt-1">
                                        {[...Array(16)].map((_, i) => (
                                            <div key={i} className={`h-6 rounded bg-gray-800 border border-gray-700 transition-colors duration-1000 ${[3,7,12,14].includes(i) ? 'bg-violet-500/20 border-violet-500/50 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.3)]' : ''}`}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: LLM Eval */}
                            <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:border-green-500/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] group flex flex-col relative">
                                {/* Connecting Node Indicator */}
                                <div className="absolute -left-6 lg:-left-12 top-1/2 w-3 h-3 bg-green-500 rounded-full -translate-y-1/2 hidden lg:block shadow-[0_0_15px_#22c55e]"></div>

                                <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-50 mb-3 tracking-tight">3. LLM Evaluation</h3>
                                <p className="text-sm text-gray-400 mb-8 leading-relaxed">Our multi-agent system cross-references the candidate's actual resume against the requisition to compute structural gap analysis.</p>
                                
                                {/* Animated Mock UI */}
                                <div className="mt-auto space-y-3 bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded bg-green-500 animate-pulse"></div>
                                        <div className="text-[10px] text-green-400 font-semibold uppercase tracking-widest">Matches Found</div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 p-2.5 rounded-lg">
                                        <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] text-green-400 font-bold border border-green-500/30">98%</div>
                                        <div className="h-1.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full" style={{width: '98%'}}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 p-2.5 rounded-lg opacity-75">
                                        <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] text-green-400 font-bold border border-green-500/30">92%</div>
                                        <div className="h-1.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full" style={{width: '92%'}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="stats" className="py-24 relative z-10 border-t border-slate-50/5 bg-gray-950 overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzOGJkZjgiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djI2SDI0VjM0SDN2LTEyaDIxdlMtMjZoMTJWMjJoMjF2MTJIMzZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                
                <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-display font-medium text-gray-300 mb-16">Reduce matching time from hours to <span className="text-slate-50 font-bold text-gradient">milliseconds.</span></h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-gray-800">
                        <div ref={setRevealRef} className="stat-item flex flex-col items-center pt-8 md:pt-0">
                            <span className="text-6xl font-bold text-sky-400 mb-3 font-display">99%</span>
                            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Faster Sourcing</span>
                        </div>
                        <div ref={setRevealRef} className="stat-item flex flex-col items-center pt-8 md:pt-0">
                            <span className="text-6xl font-bold text-violet-400 mb-3 font-display">100k+</span>
                            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Vectors Searched/sec</span>
                        </div>
                        <div ref={setRevealRef} className="stat-item flex flex-col items-center pt-8 md:pt-0">
                            <span className="text-6xl font-bold text-blue-400 mb-3 font-display">Zero</span>
                            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Bench Downtime</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative z-10 border-t border-slate-50/5 bg-gray-900 text-center">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-4xl font-display font-bold text-slate-50 mb-6">Ready to optimize your workforce?</h2>
                    <p className="text-gray-400 mb-10 text-lg">Join forward-thinking PMs and RMGs who deploy talent with extreme precision.</p>
                    <button onClick={handleStartFreeTrial} className="px-10 py-5 rounded-full bg-white text-gray-950 font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        Start Free Trial
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
}
