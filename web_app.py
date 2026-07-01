"""
web_app.py — Flask web server for the Chart Bot chatbot, Word Vector Explorer, and Open Knowledge Format (OKF) Bundle Manager.

Run:
    python web_app.py
Then open http://localhost:5000 in your browser.
"""

import math
import re
import os
import datetime
from collections import Counter

import numpy as np
import yaml
from flask import Flask, request, jsonify
from flask_cors import CORS

from stage3_load_embeddings import load_model
from faq_data import FAQS

# ── Config ────────────────────────────────────────────────────────────────────
HIGH_CONFIDENCE = 0.70
# Set low confidence slightly lower so users get answers for loose matches
LOW_CONFIDENCE  = 0.40

STOP_WORDS = {
    "a","an","the","is","are","was","were","be","been","being",
    "have","has","had","do","does","did","will","would","shall",
    "should","may","might","must","can","could","of","in","on",
    "at","to","for","with","by","from","up","about","into",
    "through","during","before","after","above","below","between",
    "out","off","over","under","again","then","once","what",
    "how","why","when","where","who","which","that","this",
    "it","its","i","me","my","we","our","you","your",
    "he","she","they","them","their","and","but","or","so",
    "if","as","than","because","while","just","also",
}

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'knowledge')

# ── NLP helpers ───────────────────────────────────────────────────────────────
def clean_and_tokenize(text):
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).split()

def compute_idf(sentences):
    N = len(sentences)
    df = Counter()
    for tokens in sentences:
        for w in set(tokens):
            df[w] += 1
    idf = {}
    for word, freq in df.items():
        idf[word] = 0.05 if word in STOP_WORDS else math.log(N / (1 + freq)) + 1.0
    return idf

def sentence_vector(model, tokens, idf):
    vecs, weights = [], []
    for w in tokens:
        if w in model:
            weight = idf.get(w, 1.0)
            vecs.append(model[w] * weight)
            weights.append(weight)
    if not vecs:
        return None
    return np.sum(vecs, axis=0) / sum(weights)

def cosine_sim(v1, v2):
    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    return float(np.dot(v1, v2) / denom) if denom > 0 else 0.0

def build_faq_index(model, faqs):
    tokenized = [clean_and_tokenize(q) for q, _ in faqs]
    idf = compute_idf(tokenized)
    index = []
    for (question, answer_text), tokens in zip(faqs, tokenized):
        vec = sentence_vector(model, tokens, idf)
        index.append({"question": question, "answer": answer_text, "vec": vec})
    return index, idf

def query(model, user_input, faq_index, idf, top_k=3):
    tokens = clean_and_tokenize(user_input)
    user_vec = sentence_vector(model, tokens, idf)
    if user_vec is None:
        return []
    scored = []
    for entry in faq_index:
        if entry["vec"] is None:
            continue
        score = cosine_sim(user_vec, entry["vec"])
        scored.append((score, entry["question"], entry["answer"]))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:top_k]

# ── Load model once at startup ────────────────────────────────────────────────
print("Loading GloVe model...")
model = load_model()
faq_index, idf = build_faq_index(model, FAQS)
print("GloVe model ready!")

# ── Flask app setup ───────────────────────────────────────────────────────────
app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# Ensure knowledge directory exists
os.makedirs(KNOWLEDGE_DIR, exist_ok=True)

# ── OKF Helpers ───────────────────────────────────────────────────────────────
def get_okf_files(directory):
    files_list = []
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith('.md'):
                abs_path = os.path.join(root, f)
                rel_path = os.path.relpath(abs_path, directory).replace('\\', '/')
                files_list.append(rel_path)
    return files_list

def clean_metadata(meta):
    if not isinstance(meta, dict):
        return meta
    cleaned = {}
    for k, v in meta.items():
        if isinstance(v, (datetime.datetime, datetime.date)):
            cleaned[k] = v.isoformat()
        elif isinstance(v, dict):
            cleaned[k] = clean_metadata(v)
        elif isinstance(v, list):
            cleaned_list = []
            for item in v:
                if isinstance(item, (datetime.datetime, datetime.date)):
                    cleaned_list.append(item.isoformat())
                elif isinstance(item, dict):
                    cleaned_list.append(clean_metadata(item))
                else:
                    cleaned_list.append(item)
            cleaned[k] = cleaned_list
        else:
            cleaned[k] = v
    return cleaned

def parse_okf_file(rel_path):
    abs_path = os.path.join(KNOWLEDGE_DIR, rel_path.replace('/', os.sep))
    if not os.path.exists(abs_path):
        return None
    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {abs_path}: {e}")
        return None
    
    metadata = {}
    markdown_body = content
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                raw_meta = yaml.safe_load(parts[1]) or {}
                metadata = clean_metadata(raw_meta)
                markdown_body = parts[2]
            except Exception as e:
                metadata = {"error": f"YAML Parse Error: {str(e)}"}
    
    if 'type' not in metadata:
        metadata['type'] = 'unknown'
        
    return {
        "id": rel_path,
        "metadata": metadata,
        "content": markdown_body.strip(),
        "raw": content
    }

def extract_links(content):
    links = re.findall(r'\[[^\]]+\]\(([^)]+)\)', content)
    internal_links = []
    for link in links:
        if not link.startswith(('http://', 'https://', 'mailto:', '#')):
            link_path = link.split('#')[0].split('?')[0]
            if link_path:
                internal_links.append(link_path)
    return internal_links

# ── Flask API Routes ──────────────────────────────────────────────────────────

@app.route("/")
def index():
    if os.path.exists(os.path.join(app.static_folder, "index.html")):
        return app.send_static_file('index.html')
    else:
        return """
        <html>
        <head>
            <title>OKF & Embeddings Backend</title>
            <style>
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    background: #0b0f19;
                    color: #e2e8f0;
                    padding: 60px 20px;
                    text-align: center;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: #111827;
                    border: 1px solid #1f2937;
                    padding: 40px;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
                }
                h1 { color: #8b5cf6; margin-bottom: 10px; font-weight: 800; }
                p { color: #9ca3af; line-height: 1.6; }
                code {
                    background: #1f2937;
                    padding: 4px 8px;
                    border-radius: 6px;
                    color: #a78bfa;
                    font-family: monospace;
                }
                .badge {
                    display: inline-block;
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    padding: 4px 12px;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <span class="badge">● Backend Online</span>
                <h1>OKF & Embeddings Backend</h1>
                <p>The Python Flask server is running successfully on port 5000.</p>
                <p>Note: The React frontend static assets (<code>dist/</code>) have not been compiled yet.</p>
                <p style="margin-top:20px; font-size:0.9rem;">
                    Please run <code>npm run dev</code> to launch the interactive workspace, which starts both this backend and the Vite dev server with Hot-Module-Replacement.
                </p>
            </div>
        </body>
        </html>
        """

# ── OKF Document CRUD APIs ──

@app.route('/api/documents', methods=['GET'])
def api_list_documents():
    files = get_okf_files(KNOWLEDGE_DIR)
    docs = []
    for f in files:
        parsed = parse_okf_file(f)
        if parsed:
            docs.append({
                "id": parsed["id"],
                "type": parsed["metadata"].get("type", "unknown"),
                "title": parsed["metadata"].get("title", parsed["id"]),
                "description": parsed["metadata"].get("description", ""),
                "tags": parsed["metadata"].get("tags", []),
                "timestamp": parsed["metadata"].get("timestamp", "")
            })
    return jsonify(docs)

@app.route('/api/documents/<path:filename>', methods=['GET'])
def api_get_document(filename):
    parsed = parse_okf_file(filename)
    if parsed is None:
        return jsonify({"error": "Document not found"}), 404
    return jsonify(parsed)

@app.route('/api/documents', methods=['POST'])
def api_create_document():
    data = request.json
    filename = data.get("id")
    if not filename:
        return jsonify({"error": "Filename ID is required"}), 400
    if not filename.endswith('.md'):
        filename += '.md'
        
    abs_path = os.path.join(KNOWLEDGE_DIR, filename.replace('/', os.sep))
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    
    metadata = data.get("metadata", {})
    content = data.get("content", "")
    
    yaml_str = yaml.dump(metadata, default_flow_style=False)
    file_content = f"---\n{yaml_str}---\n\n{content}"
    
    try:
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(file_content)
        return jsonify({"success": True, "id": filename})
    except Exception as e:
        return jsonify({"error": f"Failed to save document: {str(e)}"}), 500

@app.route('/api/documents/<path:filename>', methods=['PUT'])
def api_update_document(filename):
    data = request.json
    abs_path = os.path.join(KNOWLEDGE_DIR, filename.replace('/', os.sep))
    if not os.path.exists(abs_path):
        return jsonify({"error": "Document not found"}), 404
        
    metadata = data.get("metadata", {})
    content = data.get("content", "")
    
    yaml_str = yaml.dump(metadata, default_flow_style=False)
    file_content = f"---\n{yaml_str}---\n\n{content}"
    
    try:
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(file_content)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"Failed to update document: {str(e)}"}), 500

@app.route('/api/documents/<path:filename>', methods=['DELETE'])
def api_delete_document(filename):
    abs_path = os.path.join(KNOWLEDGE_DIR, filename.replace('/', os.sep))
    if not os.path.exists(abs_path):
        return jsonify({"error": "Document not found"}), 404
    try:
        os.remove(abs_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"Failed to delete document: {str(e)}"}), 500

# ── OKF Bundle Validation API ──

@app.route('/api/validate', methods=['GET'])
def api_validate():
    files = get_okf_files(KNOWLEDGE_DIR)
    errors = []
    warnings = []
    stats = {
        "total_files": len(files),
        "by_type": {},
        "broken_links_count": 0
    }
    
    for f in files:
        parsed = parse_okf_file(f)
        if not parsed:
            errors.append({"file": f, "message": "Failed to read or parse file"})
            continue
            
        doc_type = parsed["metadata"].get("type", "unknown")
        stats["by_type"][doc_type] = stats["by_type"].get(doc_type, 0) + 1
        
        # Check type field presence
        if "type" not in parsed["metadata"] or parsed["metadata"].get("type") == "unknown":
            errors.append({"file": f, "message": "Missing 'type' field in YAML frontmatter"})
            
        # Validate links
        links = extract_links(parsed["content"])
        doc_dir = os.path.dirname(f)
        for link in links:
            resolved_rel = os.path.normpath(os.path.join(doc_dir, link)).replace('\\', '/')
            target_abs = os.path.join(KNOWLEDGE_DIR, resolved_rel.replace('/', os.sep))
            if not os.path.exists(target_abs):
                errors.append({
                    "file": f,
                    "message": f"Broken relative link: '{link}' (resolves to '{resolved_rel}')"
                })
                stats["broken_links_count"] += 1
                
    score = max(0, 100 - (len(errors) * 15 + len(warnings) * 5))
    
    return jsonify({
        "valid": len(errors) == 0,
        "score": score,
        "errors": errors,
        "warnings": warnings,
        "stats": stats
    })

# ── Graph Building API ──

@app.route('/api/graph', methods=['GET'])
def api_graph():
    files = get_okf_files(KNOWLEDGE_DIR)
    nodes = []
    edges = []
    
    for f in files:
        parsed = parse_okf_file(f)
        if parsed:
            nodes.append({
                "id": f,
                "label": parsed["metadata"].get("title", f),
                "type": parsed["metadata"].get("type", "unknown"),
                "description": parsed["metadata"].get("description", "")
            })
            
    for f in files:
        parsed = parse_okf_file(f)
        if parsed:
            links = extract_links(parsed["content"])
            doc_dir = os.path.dirname(f)
            for link in links:
                resolved_rel = os.path.normpath(os.path.join(doc_dir, link)).replace('\\', '/')
                edges.append({
                    "from": f,
                    "to": resolved_rel,
                    "broken": not os.path.exists(os.path.join(KNOWLEDGE_DIR, resolved_rel.replace('/', os.sep)))
                })
                
    return jsonify({
        "nodes": nodes,
        "edges": edges
    })

# ── Agent Simulation API ──

@app.route('/api/agent-simulation', methods=['GET'])
def api_agent_simulation():
    query_text = request.args.get("query", "").lower()
    
    path = ["index.md"]
    reasoning = [
        "Agent starts at the root `index.md` to scan the entry point metadata and directory listings."
    ]
    
    if not query_text:
        return jsonify({"path": path, "reasoning": reasoning})
        
    if any(k in query_text for k in ["outage", "stripe", "adyen", "down", "fail", "error", "triage", "payment"]):
        path.append("concepts/payment-gateway.md")
        reasoning.append(
            "Query mentions payments, Stripe, or operational issues. Agent inspects 'concepts/payment-gateway.md' to understand the integration architecture."
        )
        path.append("playbooks/payment-outage.md")
        reasoning.append(
            "The concept documentation links to 'playbooks/payment-outage.md' for troubleshooting. Agent follows the link and retrieves recovery steps (e.g. updating env variable PROCESSOR_PRIMARY)."
        )
    elif any(k in query_text for k in ["checkout", "purchase", "order", "cart"]):
        path.append("concepts/checkout-service.md")
        reasoning.append(
            "Query relates to transactions/ordering. Agent navigates to 'concepts/checkout-service.md' which manages the checkout flow."
        )
        path.append("schemas/user-profile.md")
        reasoning.append(
            "Checkout depends on customer profile details. Agent traverses to 'schemas/user-profile.md' to verify the schema payload."
        )
    elif any(k in query_text for k in ["user", "profile", "schema", "database", "field"]):
        path.append("schemas/user-profile.md")
        reasoning.append(
            "Query relates to customer registration or schema details. Agent follows link directly to 'schemas/user-profile.md' and reads database properties."
        )
    else:
        # Generic scanner
        files = get_okf_files(KNOWLEDGE_DIR)
        best_match = None
        best_score = 0
        for f in files:
            if f == "index.md":
                continue
            parsed = parse_okf_file(f)
            if parsed:
                title = parsed["metadata"].get("title", "").lower()
                desc = parsed["metadata"].get("description", "").lower()
                tags = [t.lower() for t in parsed["metadata"].get("tags", [])]
                
                score = 0
                for word in query_text.split():
                    if len(word) > 2:
                        if word in title: score += 5
                        if word in desc: score += 2
                        if word in tags: score += 3
                        
                if score > best_score:
                    best_score = score
                    best_match = f
                    
        if best_match:
            path.append(best_match)
            reasoning.append(
                f"Agent scanned document metadata and matched queries against tags. Navigating directly to '{best_match}' (matching score: {best_score})."
            )
        else:
            reasoning.append(
                "Agent scanned all metadata fields in the OKF bundle but did not locate high-confidence tags. Terminating crawl."
            )
            
    return jsonify({
        "path": path,
        "reasoning": reasoning
    })

# ── Word Embeddings APIs (Existing word similarity and analogy functionalities) ──

@app.route("/api/embeddings/similarity", methods=["POST"])
def api_similarity():
    data = request.get_json(force=True)
    word = data.get("word", "").strip().lower()
    if not word:
        return jsonify({"error": "Word is required"}), 400
    if word not in model:
        return jsonify({"error": f"'{word}' is not in the GloVe vocabulary"}), 404
        
    neighbors = []
    for neighbor, score in model.most_similar(word, topn=10):
        neighbors.append({"word": neighbor, "similarity": round(float(score), 3)})
    return jsonify({"word": word, "neighbors": neighbors})

@app.route("/api/embeddings/analogy", methods=["POST"])
def api_analogy():
    data = request.get_json(force=True)
    a = data.get("a", "").strip().lower() # man
    b = data.get("b", "").strip().lower() # king
    c = data.get("c", "").strip().lower() # woman
    if not (a and b and c):
        return jsonify({"error": "Words a, b, and c are required for the analogy a:b :: c:?"}), 400
        
    missing = [w for w in [a, b, c] if w not in model]
    if missing:
        return jsonify({"error": f"Words not in vocabulary: {', '.join(missing)}"}), 404
        
    # Analogy formula: king - man + woman (b - a + c)
    try:
        results = model.most_similar(positive=[b, c], negative=[a], topn=5)
        analogies = [{"word": word, "similarity": round(float(score), 3)} for word, score in results]
        return jsonify({"a": a, "b": b, "c": c, "results": analogies})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat", methods=["POST"])
def chat():
    # Retain the original Chat Bot route for backwards compatibility / Streamlit integration
    data = request.get_json(force=True)
    user_input = (data.get("message") or "").strip()

    if not user_input:
        return jsonify({"answer": "Please type a question.", "score": 0})

    if user_input.lower() in ("help", "topics", "all topics", "show all topics"):
        return jsonify({"topics": [q for q, _ in FAQS]})

    results = query(model, user_input, faq_index, idf, top_k=3)

    if not results:
        return jsonify({
            "answer": "I don't recognise any of those words. Try asking about word embeddings, cosine similarity, Word2Vec, or GloVe.",
            "score": 0,
        })

    best_score, best_q, best_a = results[0]

    if best_score < LOW_CONFIDENCE:
        return jsonify({
            "answer": f"I'm not confident about that (best match {best_score:.0%}). Try rephrasing, or ask about general concepts.",
            "score": round(best_score, 3),
        })

    suggestion = None
    if best_score < HIGH_CONFIDENCE and len(results) > 1:
        alt_score, alt_q, _ = results[1]
        if alt_score > LOW_CONFIDENCE:
            suggestion = alt_q

    return jsonify({
        "answer":     best_a,
        "score":      round(best_score, 3),
        "matched_q":  best_q,
        "suggestion": suggestion,
    })

@app.route("/topics")
def topics():
    return jsonify({"topics": [q for q, _ in FAQS]})

if __name__ == "__main__":
    print("\n  OKF & Word Similarity Explorer Backend running.")
    print("  Host: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
