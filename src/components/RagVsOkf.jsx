import React, { useState } from 'react';
import { Cpu, Search, HelpCircle, Network, ArrowRight, BookOpen, AlertTriangle, Layers, MessageSquare, Terminal } from 'lucide-react';

export default function RagVsOkf() {
  const [sandboxQuery, setSandboxQuery] = useState('How do I fix a payment outage?');
  const [activePlaygroundTab, setActivePlaygroundTab] = useState('similarity');
  
  // Word Similarity state
  const [simWord, setSimWord] = useState('sweet');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);

  // Analogy state
  const [analogy, setAnalogy] = useState({ a: 'man', b: 'king', c: 'woman' });
  const [analogyResult, setAnalogyResult] = useState(null);
  const [analogyLoading, setAnalogyLoading] = useState(false);
  const [analogyError, setAnalogyError] = useState(null);

  // Chat Bot state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: "Hey! I'm the original FAQ semantic chatbot. Ask me about embeddings, Word2Vec, GloVe, or cosine similarity, and I'll match your question based on sentence vector similarity." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // ── Handlers for GloVe Embeddings APIs ──

  const handleSimilaritySearch = async (e) => {
    if (e) e.preventDefault();
    if (!simWord.trim()) return;
    
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await fetch('/api/embeddings/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: simWord.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data);
      } else {
        setSimError(data.error);
        setSimResult(null);
      }
    } catch (err) {
      setSimError("Failed to connect to the backend server.");
    } finally {
      setSimLoading(false);
    }
  };

  const handleAnalogySolve = async (e) => {
    if (e) e.preventDefault();
    if (!analogy.a || !analogy.b || !analogy.c) return;

    setAnalogyLoading(true);
    setAnalogyError(null);
    try {
      const res = await fetch('/api/embeddings/analogy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analogy)
      });
      const data = await res.json();
      if (res.ok) {
        setAnalogyResult(data);
      } else {
        setAnalogyError(data.error);
        setAnalogyResult(null);
      }
    } catch (err) {
      setAnalogyError("Failed to connect to the backend server.");
    } finally {
      setAnalogyLoading(false);
    }
  };

  const handleChatSend = async (e) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage.trim();
    setChatMessage('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      
      let botResponse = '';
      if (data.topics) {
        botResponse = `Available FAQ Topics:\n${data.topics.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}`;
      } else {
        botResponse = data.answer;
        if (data.score > 0) {
          botResponse += ` (Match Confidence: ${Math.round(data.score * 100)}%)`;
        }
        if (data.suggestion) {
          botResponse += `\n\nDid you mean: "${data.suggestion}"?`;
        }
      }

      setChatHistory(prev => [...prev, { sender: 'bot', text: botResponse }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'bot', text: "Connection error. Is the Flask server running?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper mock content for sandbox comparisons
  const getMockRagChunks = (query) => {
    const q = query.toLowerCase();
    if (q.includes('payment') || q.includes('outage') || q.includes('stripe')) {
      return [
        {
          title: "payment-gateway.md (Chunk #1 of 3)",
          content: "...The Payment Gateway Integration service acts as a router that forwards transactions to Stripe or Adyen based on geographical distribution. Any outage or network failure here will impact checkout completion...",
          match: "High Semantic Similarity (0.89)"
        },
        {
          title: "payment-gateway.md (Chunk #2 of 3)",
          content: "...Stripe API keys are configured via environment variables. The primary provider is loaded from PROCESSOR_PRIMARY dynamically on start...",
          match: "Medium Semantic Similarity (0.64)"
        },
        {
          title: "checkout-service.md (Chunk #1 of 2)",
          content: "...Checkout Service coordinates conversion of customer's shopping cart into a finalized order. This service relies on Payment Gateway...",
          match: "Low Semantic Similarity (0.42)"
        }
      ];
    }
    return [
      {
        title: "index.md (Chunk #1 of 1)",
        content: "...Welcome to the e-commerce platform knowledge base. We document our concepts, runbooks, and schemas here to help team alignment...",
        match: "Generic Match (0.35)"
      }
    ];
  };

  const getMockOkfWalk = (query) => {
    const q = query.toLowerCase();
    if (q.includes('payment') || q.includes('outage') || q.includes('stripe')) {
      return {
        steps: [
          { node: "index.md", type: "index", action: "Identify related playbooks", detail: "Scans YAML frontmatter tags. Identifies playbook link: `[Payment Outage Playbook](playbooks/payment-outage.md)`." },
          { node: "playbooks/payment-outage.md", type: "playbook", action: "Extract emergency recovery command", detail: "Scans full document intact. Finds diagnostic query & switches gateway CLI: `gcloud beta run services update payment-gateway --update-env-vars PROCESSOR_PRIMARY=ADYEN`" }
        ],
        context: "The agent retrieves the full troubleshooting document along with its parent microservice diagram links, guaranteeing zero context fragmentation."
      };
    }
    return {
      steps: [
        { node: "index.md", type: "index", action: "Scan directory listing", detail: "No explicit matching tags located. Scans list of concepts." }
      ],
      context: "Default index lookup returned."
    };
  };

  const ragChunks = getMockRagChunks(sandboxQuery);
  const okfWalk = getMockOkfWalk(sandboxQuery);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── PARADIGM COMPARISON SANDBOX ── */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Layers size={20} className="text-[#a78bfa]" /> RAG vs. OKF Comparative Sandbox
        </h2>
        <p className="text-xs text-[#94a3b8] mb-6">
          Test a query to see why vector database chunking loses SRE playbooks context, whereas OKF graph traversal retrieves precise, unified answers.
        </p>

        {/* Query Input */}
        <div className="flex gap-3 mb-8 max-w-2xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              value={sandboxQuery}
              onChange={(e) => setSandboxQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 focus:border-violet-500 outline-none"
              placeholder="e.g. How do I fix a payment outage?"
            />
          </div>
          <button onClick={() => setSandboxQuery('How do I fix a payment outage?')} className="btn btn-secondary !py-2.5 !text-xs">
            Reset Scenario
          </button>
        </div>

        {/* Side-by-Side sandbox display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traditional RAG Column */}
          <div className="p-6 rounded-2xl border border-rose-500/10 bg-rose-500/[0.01] space-y-4">
            <div className="flex justify-between items-center">
              <span className="badge badge-rose">Traditional RAG Method</span>
              <span className="text-[10px] text-[#f43f5e] font-semibold">Chunking + Vector DB</span>
            </div>
            
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              <strong>Vector Search</strong> maps your query to separate text fragments. Notice how the SRE recovery playbook CLI steps are missing because they were chunked separately!
            </p>

            <div className="space-y-3">
              {ragChunks.map((chunk, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-white/5 bg-black/30 space-y-1 text-xs">
                  <div className="flex justify-between text-[10px] text-[#64748b]">
                    <span className="font-mono">{chunk.title}</span>
                    <span className="text-[#fb7185] font-semibold">{chunk.match}</span>
                  </div>
                  <p className="text-slate-300 font-mono text-[10px] leading-normal">{chunk.content}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-[#fb7185] flex gap-2.5 items-start">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Context Loss & Failure:</strong> The actual command line switch (<code>PROCESSOR_PRIMARY=ADYEN</code>) was in a separate playbook chunk not matching the query vector, leading to hallucination or lack of help.
              </div>
            </div>
          </div>

          {/* OKF Graph Walk Column */}
          <div className="p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.01] space-y-4">
            <div className="flex justify-between items-center">
              <span className="badge badge-teal">Google OKF Agent Walk</span>
              <span className="text-[10px] text-[#10b981] font-semibold">Deterministic Graph Search</span>
            </div>
            
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              <strong>Agent traversal</strong> parses Markdown links, loading files whole and traversing logical relationships like a wiki graph.
            </p>

            <div className="space-y-3">
              {okfWalk.steps.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start text-xs">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-[#10b981] border border-emerald-500/20 flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 p-3 rounded-lg border border-white/5 bg-black/30 space-y-1">
                    <div className="flex justify-between text-[10px] text-[#64748b]">
                      <span className="font-mono text-[#a78bfa]">{step.node} ({step.type})</span>
                      <span className="text-[#10b981] font-semibold">{step.action}</span>
                    </div>
                    <p className="text-slate-300 text-[10px]">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[#34d399] flex gap-2.5 items-start">
              <Network size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Preserved Context:</strong> The agent lands on the full playbook. Links ensure it can trace context to the Payment Gateway concept if needed, resolving the outage correctly and safely.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GLOVE EMBEDDINGS PLAYGROUND (Original features) ── */}
      <div className="glass-panel p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
            <Terminal size={20} className="text-[#a78bfa]" /> GloVe Word Embeddings Playground
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Interact directly with the real pre-trained GloVe vector space loaded in the Python backend.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 gap-4">
          <button
            onClick={() => setActivePlaygroundTab('similarity')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activePlaygroundTab === 'similarity'
                ? 'border-[#8b5cf6] text-slate-100'
                : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Word Similarity
          </button>
          <button
            onClick={() => setActivePlaygroundTab('analogy')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activePlaygroundTab === 'analogy'
                ? 'border-[#8b5cf6] text-slate-100'
                : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Analogy Solver
          </button>
          <button
            onClick={() => setActivePlaygroundTab('chatbot')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activePlaygroundTab === 'chatbot'
                ? 'border-[#8b5cf6] text-slate-100'
                : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Chart Bot FAQ
          </button>
        </div>

        {/* Tab 1: Similarity */}
        {activePlaygroundTab === 'similarity' && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-[#94a3b8]">
              Type a word to find its nearest neighbors in GloVe vector space using Cosine Similarity.
            </p>
            <form onSubmit={handleSimilaritySearch} className="flex gap-3 max-w-md">
              <input
                type="text"
                value={simWord}
                onChange={(e) => setSimWord(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-slate-100 focus:border-violet-500 outline-none"
                placeholder="e.g. sweet"
              />
              <button type="submit" disabled={simLoading} className="btn btn-primary !py-2 !px-4 !text-xs">
                {simLoading ? 'Searching...' : 'Find Neighbors'}
              </button>
            </form>

            {simError && (
              <div className="text-xs text-[#f43f5e] flex gap-1.5 items-center">
                <AlertTriangle size={12} /> {simError}
              </div>
            )}

            {simResult && (
              <div className="p-4 rounded-xl border border-white/5 bg-black/20 max-w-md space-y-3">
                <h4 className="text-xs font-bold text-[#a78bfa] uppercase">Neighbors for "{simResult.word}"</h4>
                <div className="space-y-2">
                  {simResult.neighbors.map((n, idx) => (
                    <div key={idx} className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{idx + 1}. {n.word}</span>
                      <span className="text-[#10b981]">{n.similarity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Analogy */}
        {activePlaygroundTab === 'analogy' && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-[#94a3b8]">
              Solves word analogies based on vector arithmetic: <code>b - a + c</code>. Example: <code>king - man + woman = queen</code>.
            </p>
            <form onSubmit={handleAnalogySolve} className="space-y-4 max-w-lg">
              <div className="flex flex-wrap gap-3 items-center text-xs">
                <input
                  type="text"
                  value={analogy.a}
                  onChange={(e) => setAnalogy({ ...analogy, a: e.target.value })}
                  className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-center text-slate-100 focus:border-violet-500 outline-none font-mono"
                  placeholder="man"
                />
                <span className="text-[#64748b] font-bold">is to</span>
                <input
                  type="text"
                  value={analogy.b}
                  onChange={(e) => setAnalogy({ ...analogy, b: e.target.value })}
                  className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-center text-slate-100 focus:border-violet-500 outline-none font-mono"
                  placeholder="king"
                />
                <span className="text-[#64748b] font-bold">as</span>
                <input
                  type="text"
                  value={analogy.c}
                  onChange={(e) => setAnalogy({ ...analogy, c: e.target.value })}
                  className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-center text-slate-100 focus:border-violet-500 outline-none font-mono"
                  placeholder="woman"
                />
                <span className="text-[#64748b] font-bold">is to</span>
                <span className="text-violet-400 font-extrabold text-sm font-mono">?</span>
              </div>
              <button type="submit" disabled={analogyLoading} className="btn btn-primary !py-2 !px-4 !text-xs">
                {analogyLoading ? 'Computing...' : 'Solve Analogy'}
              </button>
            </form>

            {analogyError && (
              <div className="text-xs text-[#f43f5e] flex gap-1.5 items-center">
                <AlertTriangle size={12} /> {analogyError}
              </div>
            )}

            {analogyResult && (
              <div className="p-4 rounded-xl border border-white/5 bg-black/20 max-w-md space-y-3">
                <h4 className="text-xs font-bold text-[#a78bfa] uppercase">Analogy Answers</h4>
                <div className="space-y-2">
                  {analogyResult.results.map((res, idx) => (
                    <div key={idx} className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{idx + 1}. {res.word}</span>
                      <span className="text-[#10b981]">{res.similarity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Chat Bot FAQ */}
        {activePlaygroundTab === 'chatbot' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Chat Area */}
            <div className="md:col-span-2 border border-white/5 rounded-xl bg-black/30 overflow-hidden flex flex-col" style={{ height: '400px' }}>
              {/* Chat window */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 items-start text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'bot' && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                        🤖
                      </div>
                    )}
                    <div className={`p-3 rounded-xl max-w-sm whitespace-pre-wrap leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-violet-500/20 border border-violet-500/10 text-slate-100' 
                        : 'bg-white/5 border border-white/5 text-slate-300'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2 items-center text-xs text-[#64748b] ml-9">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                )}
              </div>

              {/* Chat input */}
              <form onSubmit={handleChatSend} className="border-t border-white/5 p-3 flex gap-2 bg-[#090d16]">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-violet-500 outline-none"
                  placeholder="Ask a question about embeddings..."
                />
                <button type="submit" className="btn btn-primary !py-1.5 !px-4 !text-xs">
                  Send
                </button>
              </form>
            </div>

            {/* Quick topics list */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
              <h4 className="text-xs font-bold text-[#a78bfa] uppercase">Recommended Questions</h4>
              <div className="space-y-1.5">
                {[
                  "What is cosine similarity?",
                  "What is GloVe?",
                  "What is Word2Vec?",
                  "Can embeddings be biased?",
                  "Difference between sparse and dense?"
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setChatMessage(q); }}
                    className="w-full text-left text-[11px] text-[#94a3b8] hover:text-[#a78bfa] font-medium py-1 px-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all truncate"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
