import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

export default function WhyResourceStreamPage() {
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
                    <h1 className="text-5xl md:text-6xl font-display font-extrabold tracking-tight mb-6 text-slate-50">
                        Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">ResourceStream</span>?
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                        A comprehensive, transparent technical breakdown of our architecture, the problems with traditional Resource Management software, and why we engineered ResourceStream to solve them.
                    </p>
                </div>

                <div className="space-y-12">
                    {/* Section 1 */}
                    <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-50">The Broken State of Enterprise Sourcing</h2>
                        </div>
                        
                        <div className="prose prose-invert prose-sky max-w-none text-gray-300 leading-relaxed space-y-6 text-lg">
                            <p>
                                For decades, the industry standard for Resource Management Groups (RMG) and Applicant Tracking Systems (ATS) has relied entirely on <strong>BM25 keyword matching</strong> and complex Boolean algebra. 
                            </p>
                            <p>
                                If a Project Manager requests a "Frontend React Specialist," legacy systems blindly search for exactly those tokens. If a top-tier candidate's resume instead reads <em>"Client-Side UI Architect utilizing ReactJS,"</em> they are filtered out automatically. This creates massive inefficiencies: the perfect candidate is sitting on the bench costing the company money, while the hiring manager is told there are no matches.
                            </p>
                            <div className="bg-red-500/5 border-l-4 border-red-500 p-6 rounded-r-xl mt-6">
                                <p className="text-red-200 text-base m-0 italic">
                                    "Traditional parsing fails because human experience is semantic, but legacy software is syntactic. We intentionally designed our platform to understand intent, not just text."
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-50">The Vector Era: Deep Semantic Search</h2>
                        </div>
                        
                        <div className="prose prose-invert prose-sky max-w-none text-gray-300 leading-relaxed space-y-6 text-lg">
                            <p>
                                To solve this, ResourceStream abandons pure keyword limits in favor of a <strong>Hybrid Search Architecture</strong> powered by <code className="bg-gray-800 px-2 py-1 rounded text-sky-300 text-sm">pgvector</code>.
                            </p>
                            <p>
                                When a resume enters our pipeline, it isn't just text-mined—it is passed through an embedding model that conceptually maps the candidate's entire professional history into high-dimensional vector space. When a PM submits a job requisition, it undergoes the exact same transformation.
                            </p>
                            <ul className="list-disc pl-6 space-y-4 marker:text-sky-500">
                                <li><strong className="text-white">Conceptual Alignment:</strong> The system instantly computes cosine similarity. It natively understands that <em>"AWS EC2"</em> and <em>"Amazon Cloud Compute"</em> are mathematically adjacent concepts.</li>
                                <li><strong className="text-white">Sub-30ms Precision:</strong> Vector searches bypass exhaustive table scans, yielding matches across tens of thousands of profiles in milliseconds.</li>
                                <li><strong className="text-white">Hybrid Fallback:</strong> We combine this dense vector search with sparse BM25 scoring to ensure that critical, exact terminologies (like "Secret Clearance") are never lost in semantic translation.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-50">Multi-Agent LLM Gap Analysis</h2>
                        </div>
                        
                        <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg pb-6 border-b border-gray-800 mb-6">
                            <p>
                                Most "AI" hiring tools stop at search. ResourceStream uses large language models dynamically at runtime to perform <strong>Precision Evaluation</strong>. Instead of just giving a PM an arbitrary "87% Match" score, our multi-agent framework orchestrates a deep structural comparison.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-base">
                            <div>
                                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    Evidence Extraction
                                </h4>
                                <p className="text-gray-400">The LLM scans the candidate's historical projects and highlights verbatim evidence proving they meet the requisition's demands. It completely removes the need for manual resume reading.</p>
                            </div>
                            <div>
                                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    Technical Gap Identification
                                </h4>
                                <p className="text-gray-400">If a candidate is strong in Backend but lacks CI/CD experience required by the JD, the AI explicitly lists this as a "Skill Gap," ensuring transparent and safe hiring decisions.</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 4 */}
                    <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-50">Resilient Asynchronous Backbone</h2>
                        </div>
                        
                        <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg space-y-6">
                            <p>
                                At enterprise scale, a single matching request can trigger hundreds of LLM API executions and vector recalculations. Doing this synchronously would hang the UI and crash basic servers.
                            </p>
                            <p>
                                ResourceStream mitigates this utilizing an event-driven architecture powered by <strong>RabbitMQ</strong>. All heavy lifting is offloaded to background Celery workers. The UI remains flawlessly responsive, while WebSockets push real-time updates—turning a "502 Bad Gateway" waiting game into a live, interactive data stream.
                            </p>
                        </div>
                    </div>

                    {/* Section 5 */}
                    <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-50">Silo-Breaking Role Observability</h2>
                        </div>
                        
                        <div className="prose prose-invert prose-sky max-w-none text-gray-300 leading-relaxed space-y-6 text-lg">
                            <p>
                                A critical flaw in modern Resource Management software is fragmented communication. Project Managers (PMs) request resources, Resource Management Groups (RMG) hunt for matches, and Executive VPs demand a high-level view of it all. Traditionally, these exist in separate software silos or endless email chains.
                            </p>
                            <p>
                                ResourceStream provides <strong>Unified Role-Based Command Centers</strong> synchronized dynamically. When a PM architects a Job Description and requests candidates, the RMG dashboard immediately updates with AI-pre-vetted candidates via websocket subscriptions. Once an RMG executes an allocation, it propagates directly outward:
                            </p>
                            <ul className="list-disc pl-6 space-y-4 marker:text-blue-500 bg-blue-900/10 p-6 rounded-xl border border-blue-500/20 mt-6">
                                <li><strong>Project Managers:</strong> See instant fulfillment metrics, eliminating frantic status-update meetings.</li>
                                <li><strong>RMG Specialists:</strong> Automatically cycle to the next highest priority requisition without context switching.</li>
                                <li><strong>VP & Executives:</strong> Instantly view updated global bench utilization, departmental performance, and hiring trends across the organization in high-level telemetry views.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 6 */}
                    <div className="bg-gray-900/60 backdrop-blur-md border border-slate-50/10 rounded-2xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center border border-slate-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-50">Enterprise-Grade Governance Zero Trust</h2>
                        </div>
                        
                        <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-lg pb-6 border-b border-gray-800 mb-6">
                            <p>
                                Deploying a heavily integrated AI solution opens massive attack vectors regarding data sovereignty and privacy. Talent pools map directly to raw financial and HR intelligence data. We architected ResourceStream explicitly to avoid leaking this data to public AI networks.
                            </p>
                        </div>

                        <div className="space-y-6 text-gray-400">
                            <div className="flex items-start gap-4 p-5 bg-gray-950/50 rounded-xl border border-gray-800">
                                <div className="mt-1 w-2 h-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]"></div>
                                <div>
                                    <h4 className="text-white font-bold mb-2">Isolated Embedding Pipelines</h4>
                                    <p className="text-sm leading-relaxed">Unlike wrappers that simply pipe entire databases to OpenAI, we isolate our vector generation. Internal <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-sky-300">transformers</code> engines exist logically separate from public internet nodes. Your candidates' resumes exist entirely inside your trusted VPC boundary.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-5 bg-gray-950/50 rounded-xl border border-gray-800">
                                <div className="mt-1 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]"></div>
                                <div>
                                    <h4 className="text-white font-bold mb-2">Immutable Audit Logging</h4>
                                    <p className="text-sm leading-relaxed">Every administrative role change, manual data grouping, or matching override is permanently logged. We guarantee full traceability ensuring compliance with strict multinational regulatory frameworks.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
