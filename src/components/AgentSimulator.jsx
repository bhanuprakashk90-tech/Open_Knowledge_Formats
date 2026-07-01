import React, { useState } from 'react';
import { Cpu, Terminal, GitFork, ArrowRight, Play, CheckCircle, HelpCircle } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';

export default function AgentSimulator() {
  const [query, setQuery] = useState('How do I fix a payment outage?');
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const runSimulation = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSimulation(null);
    setActiveStep(-1);

    try {
      const res = await fetch(`/api/agent-simulation?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setSimulation(data);
      
      // Animate steps one by one
      let step = 0;
      const interval = setInterval(() => {
        setActiveStep(step);
        step++;
        if (step >= data.path.length) {
          clearInterval(interval);
        }
      }, 900);
    } catch (e) {
      console.error("Simulation failed", e);
    } finally {
      setLoading(false);
    }
  };

  const getPathToHighlight = () => {
    if (!simulation) return [];
    if (activeStep === -1) return [];
    return simulation.path.slice(0, activeStep + 1);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Cpu size={20} className="text-[#a78bfa]" /> LLM Agent Graph Navigation Simulator
        </h2>
        <p className="text-xs text-[#94a3b8] mb-6">
          Submit a prompt and watch the AI agent crawl the OKF bundle link-by-link in real time to locate precise documentation context.
        </p>

        {/* Input box */}
        <form onSubmit={runSimulation} className="flex gap-3 mb-6 max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 focus:border-violet-500 outline-none"
            placeholder="Ask anything (e.g. How do I fix a payment outage?)"
          />
          <button type="submit" disabled={loading} className="btn btn-primary !py-2.5 !px-5 !text-xs flex items-center gap-1.5">
            <Play size={14} /> Simulate Crawl
          </button>
        </form>

        {/* Quick query tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-xs text-[#64748b] self-center mr-2">Try queries:</span>
          {[
            "How do I fix a payment outage?",
            "What fields are required for the user schema?",
            "Explain checkout service dependencies"
          ].map(q => (
            <button
              key={q}
              onClick={() => { setQuery(q); }}
              className="text-[10px] bg-white/5 border border-white/5 hover:border-violet-500/30 text-[#94a3b8] hover:text-[#a78bfa] px-3 py-1 rounded-full transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Simulation Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Path steps log - Left side */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-xl border border-white/5 bg-black/30 flex flex-col h-full" style={{ minHeight: '380px' }}>
              <h3 className="text-xs font-bold text-[#a78bfa] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Terminal size={14} /> Agent Reasoning Logs
              </h3>
              
              <div className="flex-1 space-y-4 overflow-y-auto">
                {!simulation && !loading && (
                  <div className="text-center py-20 text-[#64748b] text-xs">
                    <HelpCircle size={32} className="mx-auto opacity-50 mb-2" />
                    Submit a query to start the simulation.
                  </div>
                )}
                {loading && (
                  <div className="text-xs text-[#94a3b8] flex gap-2 items-center">
                    <RefreshCw className="animate-spin text-[#8b5cf6]" size={14} />
                    Agent is crawling directory hierarchy...
                  </div>
                )}
                {simulation && (
                  <div className="space-y-4">
                    {simulation.path.map((node, idx) => {
                      const isVisible = idx <= activeStep;
                      if (!isVisible) return null;
                      return (
                        <div key={idx} className="space-y-1.5 border-l-2 border-[#8b5cf6]/30 pl-4 relative animate-fade-in">
                          {/* Circle dot on list timeline */}
                          <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#8b5cf6]" />
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-violet-400 font-bold">{node}</span>
                            <span className="text-[9px] uppercase font-semibold text-[#64748b]">Step {idx + 1}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-normal">
                            {simulation.reasoning[idx]}
                          </p>
                        </div>
                      );
                    })}
                    {activeStep === simulation.path.length - 1 && (
                      <div className="p-3 bg-[#10b981]/5 border border-[#10b981]/15 rounded-lg text-xs text-[#34d399] flex gap-2 items-center animate-fade-in">
                        <CheckCircle size={16} className="shrink-0" />
                        Target document retrieved! Context contextually resolved.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive highlighted graph visualization - Right side */}
          <div className="lg:col-span-3">
            <KnowledgeGraph 
              onNodeSelect={() => {}} 
              highlightPath={getPathToHighlight()} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
