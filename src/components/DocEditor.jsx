import React, { useState, useEffect } from 'react';
import { FileText, Save, Trash2, Plus, AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';

const TEMPLATES = {
  concept: `---
type: concept
title: Service Name
description: High-level overview of what this service accomplishes.
resource: microservice://service-name
tags:
  - backend
  - microservice
timestamp: 2026-07-01T00:00:00Z
---

# Service Name

Describe the core concept or service here.

## Architecture

Detail how it works.

## Dependencies

- [Link Target](../concepts/other-service.md) - Brief description of why this depends on it.
`,
  playbook: `---
type: playbook
title: Incident Title Playbook
description: Standard operational procedures for triaging and recovering from this failure state.
resource: playbook://incident-name
tags:
  - runbook
  - SRE
timestamp: 2026-07-01T00:00:00Z
---

# Incident Title Playbook

Detail the operational emergency and its symptoms.

## Diagnosis Steps

1. Run this health check:
   \`\`\`bash
   curl -I https://api.my-service.com/health
   \`\`\`

## Recovery Actions

1. Restart the pod:
   \`\`\`bash
   kubectl rollout restart deployment/service-name
   \`\`\`
`,
  schema: `---
type: schema
title: Record Name Schema
description: Structural definition of data properties.
resource: schema://record-name
tags:
  - database
  - schema
timestamp: 2026-07-01T00:00:00Z
---

# Record Name Schema

Data properties details.

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| \`id\` | String | Yes | Primary identifier |
`
};

export default function DocEditor({ documents, activeFileId, onFileSelect, onRefresh }) {
  const [activeFile, setActiveFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [yamlError, setYamlError] = useState(null);
  const [parsedMeta, setParsedMeta] = useState({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('concept');

  useEffect(() => {
    if (activeFileId) {
      loadFile(activeFileId);
    } else if (documents.length > 0) {
      onFileSelect(documents[0].id);
    }
  }, [activeFileId]);

  const loadFile = async (id) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      setActiveFile(data);
      setRawText(data.raw);
      validateYaml(data.raw);
    } catch (e) {
      console.error("Error loading document", e);
    }
  };

  const validateYaml = (text) => {
    if (!text.startsWith('---')) {
      setYamlError("Document must start with '---' for YAML frontmatter");
      setParsedMeta({});
      return;
    }
    const parts = text.split('---', 2);
    if (parts.length < 2) {
      setYamlError("Missing closing '---' for YAML frontmatter");
      setParsedMeta({});
      return;
    }
    
    // Very basic regex-based YAML verification to avoid external libraries erroring on front-end
    const lines = parts[1].split('\n');
    const meta = {};
    let currentKey = null;
    let listItems = [];
    
    try {
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        
        // Check for list item
        if (line.startsWith('-') && currentKey) {
          const val = line.substring(1).trim().replace(/^['"]|['"]$/g, "");
          listItems.push(val);
          meta[currentKey] = listItems;
          continue;
        }
        
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.substring(0, colonIdx).trim();
          let val = line.substring(colonIdx + 1).trim();
          
          // Clear quotes
          val = val.replace(/^['"]|['"]$/g, "");
          
          if (val === '') {
            currentKey = key;
            listItems = [];
            meta[key] = [];
          } else {
            currentKey = null;
            // Parse boolean or numbers
            if (val.toLowerCase() === 'true') meta[key] = true;
            else if (val.toLowerCase() === 'false') meta[key] = false;
            else if (!isNaN(val) && val !== '') meta[key] = Number(val);
            else meta[key] = val;
          }
        }
      }
      
      if (!meta.type) {
        setYamlError("Frontmatter must contain the 'type' field");
      } else {
        setYamlError(null);
      }
      setParsedMeta(meta);
    } catch (e) {
      setYamlError(`Syntax error in frontmatter: ${e.message}`);
      setParsedMeta({});
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setRawText(val);
    validateYaml(val);
  };

  const saveFile = async () => {
    if (yamlError) {
      alert("Please fix the YAML frontmatter errors before saving!");
      return;
    }
    
    setSaving(true);
    const parts = rawText.split('---', 2);
    const markdownBody = rawText.substring(parts[0].length + parts[1].length + 6); // Offset for --- and ---
    
    try {
      const res = await fetch(`/api/documents/${activeFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: parsedMeta,
          content: markdownBody
        })
      });
      if (res.ok) {
        onRefresh();
        alert("Document saved successfully!");
      } else {
        const err = await res.json();
        alert(`Error saving document: ${err.error}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async () => {
    if (!window.confirm(`Are you sure you want to delete ${activeFile.id}?`)) return;
    try {
      const res = await fetch(`/api/documents/${activeFile.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Document deleted.");
        onRefresh();
        onFileSelect(null);
      }
    } catch (e) {
      alert("Error deleting file: " + e.message);
    }
  };

  const startCreate = () => {
    setCreating(true);
    setNewFilename('concepts/new-document.md');
    setRawText(TEMPLATES[selectedTemplate]);
    validateYaml(TEMPLATES[selectedTemplate]);
  };

  const cancelCreate = () => {
    setCreating(false);
    if (activeFileId) {
      loadFile(activeFileId);
    }
  };

  const executeCreate = async () => {
    if (!newFilename.trim()) {
      alert("Filename path is required!");
      return;
    }
    if (yamlError) {
      alert("Please fix frontmatter validation errors.");
      return;
    }

    const parts = rawText.split('---', 2);
    const markdownBody = rawText.substring(parts[0].length + parts[1].length + 6);
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newFilename,
          metadata: parsedMeta,
          content: markdownBody
        })
      });
      
      if (res.ok) {
        const data = await res.ok ? await res.json() : {};
        setCreating(false);
        onRefresh();
        onFileSelect(data.id || newFilename);
        alert("Document created!");
      } else {
        const err = await res.json();
        alert(`Error creating document: ${err.error}`);
      }
    } catch (e) {
      alert("Failed: " + e.message);
    }
  };

  // Quick Markdown Renderer written from scratch
  const renderMarkdown = (text) => {
    if (!text) return '';
    // Strip frontmatter first
    let content = text;
    if (text.startsWith('---')) {
      const parts = text.split('---', 2);
      if (parts.length >= 2) {
        content = text.substring(parts[0].length + parts[1].length + 6);
      }
    }

    // Escape basic HTML to prevent injection
    let html = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headers
    html = html.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold border-b border-white/5 pb-2 mb-4 mt-2 text-slate-100">$1</h1>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-semibold mb-3 mt-4 text-slate-200">$1</h2>');
    html = html.replace(/^### (.*?)$/gm, '<h3 class="text-md font-semibold mb-2 mt-3 text-slate-300">$1</h3>');

    // Code blocks: ```code```
    html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-black/40 border border-white/5 p-3 rounded-lg font-mono text-xs overflow-x-auto my-3 text-slate-300">$1</pre>');
    
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-[#a78bfa]">$1</code>');

    // Markdown Table parsing
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHtml += '<div class="overflow-x-auto my-3"><table class="w-full text-left text-xs border-collapse border border-white/5">';
        }
        
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        
        // Check for alignment row |---|---|
        if (cells.every(cell => /^:-*-*:*|-+$/.test(cell))) {
          continue;
        }
        
        const isHeader = tableHtml.includes('<thead>') === false && tableHtml.includes('<tbody>') === false;
        if (isHeader) {
          tableHtml += '<thead class="bg-white/5 border-b border-white/5"><tr>';
          cells.forEach(c => { tableHtml += `<th class="p-2 font-bold">${c}</th>`; });
          tableHtml += '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr class="border-b border-white/5 hover:bg-white/[0.01]">';
          cells.forEach(c => { tableHtml += `<td class="p-2">${c}</td>`; });
          tableHtml += '</tr>';
        }
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</tbody></table></div>';
          lines[i] = tableHtml + '\n' + lines[i];
          tableHtml = '';
        }
      }
    }
    html = lines.join('\n');

    // Relative links [text](path)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (url.startsWith('http') || url.startsWith('#')) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#a78bfa] hover:underline">${text}</a>`;
      }
      return `<a href="${url}" class="text-[#a78bfa] hover:underline font-semibold relative-link">${text}</a>`;
    });

    // List items
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li class="ml-4 list-disc text-xs text-[#94a3b8] py-0.5">$1</li>');
    html = html.replace(/^\s*\*\s+(.*?)$/gm, '<li class="ml-4 list-disc text-xs text-[#94a3b8] py-0.5">$1</li>');

    // Paragraphs
    html = html.split('\n\n').map(p => {
      p = p.trim();
      if (!p) return '';
      // Don't wrap list items, headers, pre blocks, or tables
      if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<li') || p.startsWith('<div') || p.startsWith('<table')) {
        return p;
      }
      return `<p class="text-xs text-[#94a3b8] leading-relaxed my-2">${p}</p>`;
    }).join('\n');

    return html;
  };

  // Intercept clicks in markdown preview to open related local files inside editor
  const handlePreviewClick = (e) => {
    const target = e.target.closest('a.relative-link');
    if (target) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href && activeFile) {
        const parts = activeFile.id.split('/');
        parts.pop(); // Remove filename, e.g. ["concepts"]
        
        // Resolve parent references
        const resolvedParts = [...parts, ...href.split('/')]
          .filter(p => p && p !== '.')
          .reduce((acc, part) => {
            if (part === '..') acc.pop();
            else acc.push(part);
            return acc;
          }, []);
          
        const resolvedPath = resolvedParts.join('/');
        
        // Check if file exists in list
        const exists = documents.some(d => d.id === resolvedPath);
        if (exists) {
          onFileSelect(resolvedPath);
        } else {
          alert(`Target file "${resolvedPath}" does not exist in the bundle. Introduce it or fix the link!`);
        }
      }
    }
  };

  const handleTemplateChange = (e) => {
    const tmpl = e.target.value;
    setSelectedTemplate(tmpl);
    setRawText(TEMPLATES[tmpl]);
    validateYaml(TEMPLATES[tmpl]);
  };

  return (
    <div className="glass-panel p-6 space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Document Editor</h2>
          <p className="text-xs text-[#94a3b8]">Create and modify Open Knowledge Format Markdown files in real time.</p>
        </div>
        <div className="flex gap-2">
          {!creating ? (
            <button onClick={startCreate} className="btn btn-teal !py-2.5 !px-4 !text-xs">
              <Plus size={14} /> Create Document
            </button>
          ) : (
            <>
              <button onClick={executeCreate} className="btn btn-teal !py-2.5 !px-4 !text-xs">
                Save New Document
              </button>
              <button onClick={cancelCreate} className="btn btn-secondary !py-2.5 !px-4 !text-xs">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document list sidebar */}
        <div className="border-r border-white/5 pr-4 space-y-3 lg:col-span-1">
          <h3 className="text-xs font-bold text-[#a78bfa] uppercase tracking-wider mb-2">Documents</h3>
          <div className="space-y-1 overflow-y-auto max-h-[460px]">
            {documents.map(doc => {
              const isActive = doc.id === activeFileId;
              const typeColor = 
                doc.type === 'concept' ? 'border-[#8b5cf6]' :
                doc.type === 'playbook' ? 'border-[#10b981]' :
                doc.type === 'schema' ? 'border-[#f59e0b]' :
                doc.type === 'index' ? 'border-[#6366f1]' :
                'border-[#f43f5e]';
              return (
                <button
                  key={doc.id}
                  onClick={() => { cancelCreate(); onFileSelect(doc.id); }}
                  className={`w-full text-left p-3 rounded-lg border-l-[3px] text-xs transition-all flex items-center justify-between ${
                    isActive 
                      ? 'bg-violet-500/10 text-slate-100 border-l-[#8b5cf6] border-white/5' 
                      : 'hover:bg-white/5 text-[#94a3b8] border-l-transparent border-transparent'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold truncate">{doc.title}</div>
                    <div className="text-[10px] opacity-60 font-mono mt-0.5 truncate">{doc.id}</div>
                  </div>
                  <ChevronRight size={14} className="opacity-40" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Main Section */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
          {/* File creation form header */}
          {creating && (
            <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-3">
              <h4 className="text-xs font-bold text-teal-400">Creating New Document</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-[#94a3b8] font-bold uppercase mb-1">File Path (under /knowledge)</label>
                  <input
                    type="text"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    placeholder="concepts/my-new-concept.md"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-100 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#94a3b8] font-bold uppercase mb-1">Document Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                    className="w-full bg-[#111827] border border-white/10 rounded-lg p-2 text-xs text-slate-100 focus:border-teal-500 outline-none"
                  >
                    <option value="concept">Concept Microservice</option>
                    <option value="playbook">SRE Playbook</option>
                    <option value="schema">Data Schema</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Edit status line */}
          <div className="flex flex-wrap justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-lg gap-3">
            <div className="flex items-center gap-2 text-xs">
              <FileText size={14} className="text-[#a78bfa]" />
              <span className="font-mono text-[11px] text-[#94a3b8]">
                {creating ? 'New File buffer' : (activeFile?.id || 'No file selected')}
              </span>
            </div>
            
            {/* Frontmatter status */}
            <div className="flex items-center gap-3 text-xs">
              {yamlError ? (
                <span className="text-[#f43f5e] font-semibold flex items-center gap-1.5 animate-pulse">
                  <AlertCircle size={14} /> Frontmatter Error
                </span>
              ) : (
                <span className="text-[#10b981] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> YAML Frontmatter Valid
                </span>
              )}
              
              {!creating && activeFile && (
                <div className="flex gap-2">
                  <button
                    onClick={saveFile}
                    disabled={saving || !!yamlError}
                    className="btn btn-secondary !py-1.5 !px-3 !text-[11px] !font-medium flex items-center gap-1 hover:border-[#10b981]/40"
                  >
                    <Save size={12} /> Save
                  </button>
                  <button
                    onClick={deleteFile}
                    className="btn btn-rose !py-1.5 !px-3 !text-[11px] !font-medium flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editor Grid: Left pane Code, Right pane Rendered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ height: '500px' }}>
            {/* Left pane: Textarea editor */}
            <div className="flex flex-col border border-white/5 rounded-xl bg-black/20 overflow-hidden relative">
              <div className="bg-white/[0.03] border-b border-white/5 px-3 py-1.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-mono">
                Source Code Editor (Markdown + Frontmatter)
              </div>
              <textarea
                value={rawText}
                onChange={handleTextChange}
                className="flex-1 w-full bg-transparent p-4 resize-none outline-none font-mono text-xs text-[#cbd5e1] leading-relaxed"
                placeholder="---&#10;type: concept&#10;title: My Title&#10;---&#10;&#10;# Content"
              />
              {yamlError && (
                <div className="absolute bottom-0 inset-x-0 bg-[#f43f5e] text-white p-3 text-xs flex gap-2 items-start shadow-lg">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>{yamlError}</div>
                </div>
              )}
            </div>

            {/* Right pane: Markdown Live preview */}
            <div className="flex flex-col border border-white/5 rounded-xl bg-[#090d16] overflow-hidden">
              <div className="bg-white/[0.03] border-b border-white/5 px-3 py-1.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-mono flex justify-between items-center">
                <span>Interlinked Live Preview</span>
                {parsedMeta.type && (
                  <span className="text-[10px] font-semibold text-[#a78bfa] capitalize">
                    Type: {parsedMeta.type}
                  </span>
                )}
              </div>
              
              <div 
                onClick={handlePreviewClick}
                className="flex-1 overflow-y-auto p-5 select-text select-all prose max-w-none text-slate-300"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(rawText) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
