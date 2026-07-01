import React, { useState, useEffect } from 'react';
import { Layers, FileText, Cpu, LayoutDashboard, GitFork, Radio, AlertTriangle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import KnowledgeGraph from './components/KnowledgeGraph';
import DocEditor from './components/DocEditor';
import RagVsOkf from './components/RagVsOkf';
import AgentSimulator from './components/AgentSimulator';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [validationStats, setValidationStats] = useState(null);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAppData = async () => {
    setLoading(true);
    try {
      // 1. Fetch document list
      const docRes = await fetch('/api/documents');
      if (!docRes.ok) throw new Error("Backend response error");
      const docData = await docRes.json();
      setDocuments(docData);

      // 2. Fetch validation stats
      const valRes = await fetch('/api/validate');
      if (valRes.ok) {
        const valData = await valRes.json();
        setValidationStats(valData);
      }

      setIsConnected(true);
    } catch (e) {
      console.error("Failed to connect to backend", e);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, []);

  const handleNodeSelect = (nodeId) => {
    setActiveFileId(nodeId);
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header bar */}
      <header className="glass-panel !rounded-none border-t-0 border-x-0 border-b border-white/5 sticky top-0 z-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4 bg-black/45">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8b5cf6] to-[#6366f1] flex items-center justify-center font-bold text-white text-lg shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            ⚡
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-glow">Open Knowledge Format Explorer</h1>
            <p className="text-[10px] text-[#64748b] font-mono">Agent-Friendly LLM-Wiki Standard &bull; v0.1</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn !py-2 !px-4 !text-xs !font-medium flex items-center gap-1.5 ${
              activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary !bg-transparent !border-transparent hover:!bg-white/5'
            }`}
          >
            <LayoutDashboard size={14} /> Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('graph')}
            className={`btn !py-2 !px-4 !text-xs !font-medium flex items-center gap-1.5 ${
              activeTab === 'graph' ? 'btn-primary' : 'btn-secondary !bg-transparent !border-transparent hover:!bg-white/5'
            }`}
          >
            <GitFork size={14} /> Knowledge Graph
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`btn !py-2 !px-4 !text-xs !font-medium flex items-center gap-1.5 ${
              activeTab === 'editor' ? 'btn-primary' : 'btn-secondary !bg-transparent !border-transparent hover:!bg-white/5'
            }`}
          >
            <FileText size={14} /> Document Editor
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`btn !py-2 !px-4 !text-xs !font-medium flex items-center gap-1.5 ${
              activeTab === 'sandbox' ? 'btn-primary' : 'btn-secondary !bg-transparent !border-transparent hover:!bg-white/5'
            }`}
          >
            <Layers size={14} /> RAG vs OKF Sandbox
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`btn !py-2 !px-4 !text-xs !font-medium flex items-center gap-1.5 ${
              activeTab === 'simulator' ? 'btn-primary' : 'btn-secondary !bg-transparent !border-transparent hover:!bg-white/5'
            }`}
          >
            <Cpu size={14} /> Agent Simulator
          </button>
        </nav>

        {/* Floating status */}
        <div className="flex items-center gap-2 text-xs">
          {isConnected ? (
            <span className="badge badge-teal">
              <span className="glow-dot bg-emerald-400" /> API Connected
            </span>
          ) : (
            <span className="badge badge-rose">
              <AlertTriangle size={12} /> Server Offline
            </span>
          )}
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {!isConnected && (
          <div className="glass-panel p-6 border border-rose-500/20 bg-rose-500/5 text-center space-y-4 max-w-xl mx-auto my-12">
            <AlertTriangle size={48} className="text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-100">Cannot Connect to Flask API</h2>
            <p className="text-xs text-[#94a3b8]">
              The Web UI is running but cannot connect to the Python Flask backend server. 
              Please make sure <code>python web_app.py</code> is running on port 5000.
            </p>
            <button onClick={fetchAppData} className="btn btn-primary !text-xs">
              Retry Connection
            </button>
          </div>
        )}

        {isConnected && (
          <div>
            {activeTab === 'dashboard' && (
              <Dashboard 
                stats={validationStats} 
                documents={documents} 
                setActiveTab={setActiveTab}
              />
            )}
            
            {activeTab === 'graph' && (
              <KnowledgeGraph 
                onNodeSelect={handleNodeSelect} 
              />
            )}

            {activeTab === 'editor' && (
              <DocEditor 
                documents={documents} 
                activeFileId={activeFileId} 
                onFileSelect={setActiveFileId} 
                onRefresh={fetchAppData}
              />
            )}

            {activeTab === 'sandbox' && (
              <RagVsOkf />
            )}

            {activeTab === 'simulator' && (
              <AgentSimulator />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
