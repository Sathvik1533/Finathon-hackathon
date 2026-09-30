import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CANONICAL_EASE, SPRING_FAST, buttonPressProps, cardHoverProps } from '../utils/motion';

export const NeuformLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('Create a green and white fintech payment reconciliation dashboard with 1:N settlement matcher and audit trail');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Fintech' | 'SaaS' | 'Terminal' | 'Mobile'>('All');

  const templates = [
    {
      id: 't-1',
      title: 'LedgerSense FIN-11',
      category: 'Fintech',
      author: '@sathvik',
      likes: 248,
      remixes: 89,
      tags: ['Reconciliation', 'Green Palette', 'Framer Motion', 'DESIGN.md'],
      desc: 'Deterministic multi-stream payment reconciliation engine with J.P. Morgan synthetic feeds.',
      gradient: 'from-emerald-950 via-teal-900 to-slate-950',
      action: () => navigate('/dashboard'),
    },
    {
      id: 't-2',
      title: 'HyperLiquid Dark Terminal',
      category: 'Terminal',
      author: '@neuform_core',
      likes: 512,
      remixes: 142,
      tags: ['Trading Terminal', 'Orderbook', 'High Frequency'],
      desc: 'Sub-millisecond visual settlement orderbook with dense tabular monospace typography.',
      gradient: 'from-slate-950 via-zinc-900 to-black',
      action: () => alert('Remixing HyperLiquid Dark Terminal template...'),
    },
    {
      id: 't-3',
      title: 'Aura Minimalist SaaS',
      category: 'SaaS',
      author: '@alex_design',
      likes: 384,
      remixes: 96,
      tags: ['B2B SaaS', 'Linear Design', 'Glassmorphism'],
      desc: 'Clean enterprise workspace dashboard with subtle glass borders and keyboard navigation.',
      gradient: 'from-blue-950 via-indigo-950 to-slate-950',
      action: () => alert('Remixing Aura Minimalist SaaS template...'),
    },
    {
      id: 't-4',
      title: 'Quixotic Payment App',
      category: 'Mobile',
      author: '@design_lead',
      likes: 421,
      remixes: 118,
      tags: ['Mobile UX', 'Forest Green', 'Capsule Charts'],
      desc: 'iOS thumb-accessible payment card and weekly revenue tracking cockpit.',
      gradient: 'from-emerald-900 via-teal-950 to-black',
      action: () => navigate('/dashboard'),
    },
  ];

  const filteredTemplates = selectedCategory === 'All'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e7e7e7] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Top Laser Beam Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-48 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Neuform Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#050505]/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-emerald-500/20">
            N
          </div>
          <span className="font-bold text-base tracking-tight text-white font-mono">neuform.ai</span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            v2.4 Engine
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
          <a href="#prompt" className="hover:text-white transition-colors">Prompt Generator</a>
          <a href="#remix" className="hover:text-white transition-colors">Remix Gallery</a>
          <a href="#design-md" className="hover:text-white transition-colors">DESIGN.md Specs</a>
          <button onClick={() => navigate('/dashboard')} className="hover:text-emerald-400 transition-colors font-medium">
            Open LedgerSense →
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <motion.button
            {...buttonPressProps}
            onClick={() => navigate('/dashboard')}
            className="text-xs bg-white text-black font-semibold px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Launch Prototype
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-8 max-w-5xl mx-auto text-center space-y-6">
        
        {/* Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: CANONICAL_EASE }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs font-mono text-zinc-400"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>AI HTML Landing Page Builder & Remix Templates</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: CANONICAL_EASE, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto font-sans"
        >
          Neuform turns prompts into <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">production-grade UI</span> and reusable DESIGN.md files.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: CANONICAL_EASE, delay: 0.2 }}
          className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Generate responsive web components, presentation slides, mobile mockups, and structured design tokens calibrated for autonomous coding agents.
        </motion.p>

        {/* The Neuform Signature Prompt Box */}
        <motion.div
          id="prompt"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: CANONICAL_EASE, delay: 0.3 }}
          className="mt-8 p-2 rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl max-w-3xl mx-auto space-y-3"
        >
          <div className="flex items-center justify-between px-3 pt-2 text-[11px] font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Prompt Engine: Gemini 3.1 Pro + Claude 3.7 Sonnet</span>
            </span>
            <span>Remix-Ready</span>
          </div>

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-transparent border-0 text-white text-sm focus:outline-none resize-none px-3 font-mono leading-relaxed"
            placeholder="Describe your design, layout rhythm, color palette, or system architecture..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06] px-3 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-500">Tokens:</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300">Tailwind v3</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300">Framer Motion</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300">DESIGN.md</span>
            </div>

            <motion.button
              {...buttonPressProps}
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <span>Generate UI</span>
              <span>⚡</span>
            </motion.button>
          </div>
        </motion.div>

      </section>

      {/* Core Features 3-Pillar Grid */}
      <section className="py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white tracking-tight">The Agent-Ready Design Framework</h2>
          <p className="text-xs text-zinc-400 mt-1">Built specifically to prevent generic AI slop and ensure mathematical design consistency</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <motion.div
            {...cardHoverProps}
            className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] space-y-3"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg font-bold font-mono">
              01
            </div>
            <h3 className="text-base font-bold text-white">Prompt-to-UI Synthesis</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generates fully animated, responsive layouts directly into clean React + Tailwind components without pre-baked bloated templates.
            </p>
          </motion.div>

          <motion.div
            {...cardHoverProps}
            className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] space-y-3"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-lg font-bold font-mono">
              02
            </div>
            <h3 className="text-base font-bold text-white">DESIGN.md Integration</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Produces reusable, structured design governance documentation with strict easing tokens, duration caps, and WCAG 2.1 accessibility constraints.
            </p>
          </motion.div>

          <motion.div
            {...cardHoverProps}
            className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] space-y-3"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg font-bold font-mono">
              03
            </div>
            <h3 className="text-base font-bold text-white">Remix Tree & Forking</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Branch and remix community templates with visual tree lineage, instant code exports, and one-click deployment pipelines.
            </p>
          </motion.div>

        </div>
      </section>

      {/* Remix Template Showcase */}
      <section id="remix" className="py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-white/[0.06]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Remix-Ready Templates</h2>
            <p className="text-xs text-zinc-400 mt-1">Study prompt workflows and fork high-craft layouts into your project</p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#141414] p-1 rounded-full text-xs">
            {(['All', 'Fintech', 'SaaS', 'Terminal', 'Mobile'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map(tpl => (
            <motion.div
              key={tpl.id}
              {...cardHoverProps}
              className="p-6 rounded-3xl border border-white/[0.08] bg-[#0c0c0c] space-y-4 hover:border-emerald-500/40 transition-colors"
            >
              <div className={`h-40 rounded-2xl bg-gradient-to-tr ${tpl.gradient} p-5 flex flex-col justify-between border border-white/[0.05]`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-white border border-white/10">
                    {tpl.category}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">♥ {tpl.likes}</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white font-mono">{tpl.title}</h4>
                  <p className="text-[11px] text-zinc-300 font-sans mt-0.5">{tpl.desc}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {tpl.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                <span className="text-zinc-500 font-mono text-[11px]">By {tpl.author}</span>
                <motion.button
                  {...buttonPressProps}
                  onClick={tpl.action}
                  className="px-4 py-1.5 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors cursor-pointer text-xs"
                >
                  Inspect Template →
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DESIGN.md Agent Handoff Spec Section */}
      <section id="design-md" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto border-t border-white/[0.06] space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Structured DESIGN.md Export</h2>
          <p className="text-xs text-zinc-400">Every Neuform template automatically generates a machine-readable DESIGN.md for Claude, Cursor, and Copilot</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] font-mono text-xs text-zinc-300 space-y-3 overflow-x-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-zinc-500">
            <span>DESIGN.md — Token Spec</span>
            <span className="text-emerald-400">✓ Validated Against INTERACTION-PATTERNS.md</span>
          </div>
          <pre className="text-[11px] text-emerald-400/90 leading-relaxed">
{`# DESIGN.md — FinOps Quixotic System
Palette:
  - primary: #006241 (Deep Forest Green)
  - accent:  #00c070 (Mint indicator)
  - surface: #ffffff (White rounded-[32px] container)
  - canvas:  #f4f5f7 (Neutral soft slate)
Motion Tokens:
  - ease: [0.16, 1, 0.3, 1] (Canonical luxury ease-out)
  - spring: stiffness: 400, damping: 17
  - stagger: 60ms sweet spot`}
          </pre>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 px-4 sm:px-8 text-center text-xs text-zinc-500">
        <div className="flex items-center justify-center gap-6 mb-3">
          <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors">LedgerSense Cockpit</button>
          <a href="https://neuform.ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Official neuform.ai</a>
          <button onClick={() => navigate('/report')} className="hover:text-white transition-colors">Module 11 Report</button>
        </div>
        <div>Neuform AI Landing Page & Design System Archive · Acquired for Finathon Hackathon</div>
      </footer>

    </div>
  );
};
