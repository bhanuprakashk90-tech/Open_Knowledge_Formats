import React from 'react';
import { BookOpen, FileText, CheckCircle2, AlertTriangle, Cpu, HelpCircle, GitFork } from 'lucide-react';

export default function Dashboard({ stats, documents, setActiveTab }) {
  const fileCount = documents.length;
  const errorCount = stats?.errors?.length || 0;
  const warningCount = stats?.warnings?.length || 0;
  const score = stats?.score ?? 100;
  const typeCounts = stats?.stats?.by_type || {};

  // Count tags
  const tagsMap = {};
  documents.forEach(d => {
    if (Array.isArray(d.tags)) {
      d.tags.forEach(tag => {
        tagsMap[tag] = (tagsMap[tag] || 0) + 1;
      });
    }
  });
  const tagsSorted = Object.entries(tagsMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-[#10b981]';
    if (score >= 70) return 'text-[#f59e0b]';
    return 'text-[#f43f5e]';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-panel p-8 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(30, 20, 70, 0.45) 0%, rgba(15, 20, 35, 0.8) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <div className="relative z-10 max-w-3xl">
          <span className="badge badge-violet mb-4">
            <Cpu size={12} /> Standard Specification
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-glow bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
            Open Knowledge Format (OKF)
          </h1>
          <p className="text-[#94a3b8] text-lg leading-relaxed mb-6">
            The open, vendor-neutral specification published by Google Cloud in June 2026. 
            OKF formalizes the "LLM-wiki" pattern—structuring organizational data using 
            Markdown files and YAML frontmatter, making it natively consumable by AI agents.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('graph')} className="btn btn-primary">
              Explore Knowledge Graph <GitFork size={16} />
            </button>
            <button onClick={() => setActiveTab('editor')} className="btn btn-secondary">
              Manage Documents <FileText size={16} />
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none bg-gradient-to-l from-violet-500 to-transparent flex items-center justify-center">
          <BookOpen size={240} className="text-violet-500" />
        </div>
      </div>

      {/* Grid Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Stat 1 */}
        <div className="glass-panel p-6 flex items-center gap-5">
          <div className="p-4 rounded-xl bg-violet-500/10 text-[#a78bfa] border border-violet-500/20">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">{fileCount}</div>
            <div className="text-xs text-[#94a3b8] uppercase tracking-wider font-semibold">Total Documents</div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="glass-panel p-6 flex items-center gap-5">
          <div className={`p-4 rounded-xl border ${score >= 90 ? 'bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20' : 'bg-[#f59e0b]/10 text-[#fbbf24] border-[#f59e0b]/20'}`}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className={`text-3xl font-extrabold tracking-tight ${getScoreColor(score)}`}>
              {score}%
            </div>
            <div className="text-xs text-[#94a3b8] uppercase tracking-wider font-semibold">Bundle Health Score</div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="glass-panel p-6 flex items-center gap-5">
          <div className={`p-4 rounded-xl ${errorCount > 0 ? 'bg-[#f43f5e]/10 text-[#fb7185] border border-[#f43f5e]/20' : 'bg-white/5 text-[#94a3b8] border border-white/5'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">{errorCount}</div>
            <div className="text-xs text-[#94a3b8] uppercase tracking-wider font-semibold">Broken Links / Errors</div>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="glass-panel p-6 flex items-center gap-5">
          <div className="p-4 rounded-xl bg-indigo-500/10 text-[#818cf8] border border-indigo-500/20">
            <GitFork size={24} />
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">
              {Object.keys(typeCounts).length}
            </div>
            <div className="text-xs text-[#94a3b8] uppercase tracking-wider font-semibold">Unique Types</div>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: RAG vs OKF */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Cpu size={18} className="text-[#a78bfa]" /> Why is OKF Better than Traditional RAG?
            </h3>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">
              Retrieval-Augmented Generation (RAG) splits text into arbitrary chunks, embeds them as vectors, 
              and searches them based on cosine similarity. While powerful, this "black-box" approach strips out 
              context, structure, and relationship links. OKF solves these limitations:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RAG column */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-colors">
                <span className="badge badge-rose mb-3">Traditional RAG</span>
                <ul className="space-y-3 text-xs text-[#94a3b8] list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-[#f43f5e] font-bold">✕</span>
                    <span><strong>Loss of Hierarchy:</strong> Chunking shreds document structures, splitting parent policies from sub-procedures.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#f43f5e] font-bold">✕</span>
                    <span><strong>Hallucinations:</strong> Missing context triggers models to patch gaps with fake parameters or command args.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#f43f5e] font-bold">✕</span>
                    <span><strong>Black-box Retrieval:</strong> Hard to audit which exact vector was retrieved and why.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#f43f5e] font-bold">✕</span>
                    <span><strong>Computationally Heavy:</strong> Requires vector embeddings, semantic index database, and runtime vector comparisons.</span>
                  </li>
                </ul>
              </div>

              {/* OKF column */}
              <div className="p-5 rounded-xl border border-[#10b981]/10 bg-[#10b981]/[0.01] hover:border-[#10b981]/25 transition-colors">
                <span className="badge badge-teal mb-3">Google's Open Knowledge Format</span>
                <ul className="space-y-3 text-xs text-[#94a3b8] list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-[#10b981] font-bold">✓</span>
                    <span><strong>Preserves Links:</strong> Explicit markdown links allow agents to traverse documentation logically like a human.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10b981] font-bold">✓</span>
                    <span><strong>Structured Metadata:</strong> YAML frontmatter defines types (concept, playbook, schema), timestamps, and tags.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10b981] font-bold">✓</span>
                    <span><strong>Fully Auditable:</strong> The path taken by the agent is deterministic, human-readable, and easily logged.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10b981] font-bold">✓</span>
                    <span><strong>Zero Compute Storage:</strong> Plain markdown text files require no proprietary runtimes or databases, versioned cleanly in Git.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-violet-500/5 border border-violet-500/10 flex justify-between items-center">
              <span className="text-xs text-[#94a3b8]">Want to test this live? Run simulated queries in the Sandbox.</span>
              <button onClick={() => setActiveTab('sandbox')} className="btn btn-secondary !py-2 !px-4 !text-xs">
                Go to RAG vs OKF Sandbox
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Bundle stats / distributions */}
        <div className="space-y-6">
          {/* Document Types Card */}
          <div className="glass-panel p-6">
            <h3 className="text-md font-bold mb-4 flex items-center gap-2">
              <FileText size={16} className="text-[#a78bfa]" /> Document Type Distribution
            </h3>
            {Object.keys(typeCounts).length === 0 ? (
              <p className="text-xs text-[#64748b]">No documents loaded.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(typeCounts).map(([type, count]) => {
                  const pct = Math.round((count / fileCount) * 100);
                  const colors = {
                    concept: 'bg-[#8b5cf6]',
                    playbook: 'bg-[#10b981]',
                    schema: 'bg-[#fbbf24]',
                    index: 'bg-[#6366f1]',
                    unknown: 'bg-[#64748b]'
                  };
                  const barColor = colors[type] || 'bg-[#8b5cf6]';
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="capitalize">{type}</span>
                        <span className="text-[#94a3b8]">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Popular Tags */}
          <div className="glass-panel p-6">
            <h3 className="text-md font-bold mb-4 flex items-center gap-2">
              <HelpCircle size={16} className="text-[#a78bfa]" /> Top Keywords & Tags
            </h3>
            {tagsSorted.length === 0 ? (
              <p className="text-xs text-[#64748b]">No tags found in frontmatter.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagsSorted.map(([tag, count]) => (
                  <span key={tag} className="badge badge-indigo text-xs">
                    #{tag} <span className="opacity-60 ml-1">({count})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
