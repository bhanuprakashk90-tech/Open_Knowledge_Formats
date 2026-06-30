"""
web_app.py — Flask web server for the Chart Bot chatbot.

Run:
    python web_app.py
Then open http://localhost:5000 in your browser.
"""

import math
import re
from collections import Counter

import numpy as np
from flask import Flask, request, jsonify, render_template_string

from stage3_load_embeddings import load_model
from faq_data import FAQS

# ── Config ────────────────────────────────────────────────────────────────────
HIGH_CONFIDENCE = 0.70
LOW_CONFIDENCE  = 0.45

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
print("Ready!")

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Chart Bot — Word Vector Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d1117;
      --surface:   #161b22;
      --surface2:  #21262d;
      --border:    #30363d;
      --accent:    #7c6ff7;
      --accent2:   #a78bfa;
      --green:     #3fb950;
      --yellow:    #d29922;
      --red:       #f85149;
      --text:      #e6edf3;
      --muted:     #8b949e;
      --user-bg:   #1a3a5c;
      --bot-bg:    #1e2a1e;
      --radius:    14px;
      --font:      'Inter', system-ui, sans-serif;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Header ── */
    header {
      background: linear-gradient(135deg, #1a1040 0%, #0d1117 100%);
      border-bottom: 1px solid var(--border);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    .logo {
      width: 42px; height: 42px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 20px rgba(124,111,247,.35);
    }
    header h1 { font-size: 1.15rem; font-weight: 700; letter-spacing: -.3px; }
    header p  { font-size: .75rem; color: var(--muted); margin-top: 1px; }
    .badge {
      margin-left: auto;
      background: rgba(63,185,80,.15);
      border: 1px solid rgba(63,185,80,.3);
      color: var(--green);
      font-size: .7rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      display: flex; align-items: center; gap: 5px;
    }
    .dot {
      width: 7px; height: 7px;
      background: var(--green);
      border-radius: 50%;
      animation: pulse 1.8s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }

    /* ── Chips (quick questions) ── */
    .chips-bar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 10px 20px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .chip {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--accent2);
      font-size: .72rem;
      font-weight: 500;
      padding: 5px 12px;
      border-radius: 999px;
      cursor: pointer;
      transition: all .18s;
      white-space: nowrap;
    }
    .chip:hover { background: rgba(124,111,247,.15); border-color: var(--accent); color: var(--text); }

    /* ── Messages ── */
    #chat-window {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      scroll-behavior: smooth;
    }
    #chat-window::-webkit-scrollbar { width: 6px; }
    #chat-window::-webkit-scrollbar-track { background: transparent; }
    #chat-window::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .msg-row {
      display: flex;
      gap: 10px;
      max-width: 760px;
      animation: slideIn .25s ease;
    }
    @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

    .msg-row.user  { align-self: flex-end; flex-direction: row-reverse; }
    .msg-row.bot   { align-self: flex-start; }

    .avatar {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .avatar.bot  { background: linear-gradient(135deg, var(--accent), var(--accent2)); }
    .avatar.user { background: linear-gradient(135deg, #1a3a5c, #2563eb); }

    .bubble {
      padding: 12px 16px;
      border-radius: var(--radius);
      font-size: .88rem;
      line-height: 1.6;
      max-width: 580px;
    }
    .msg-row.user  .bubble { background: var(--user-bg); border-bottom-right-radius: 4px; }
    .msg-row.bot   .bubble { background: var(--bot-bg);  border-bottom-left-radius: 4px; border: 1px solid var(--border); }

    /* confidence bar inside bubble */
    .conf-row {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 8px;
    }
    .conf-label { font-size: .68rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .conf-bar-outer { flex: 1; height: 5px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
    .conf-bar-inner { height: 100%; border-radius: 3px; transition: width .6s ease; }
    .conf-pct { font-size: .7rem; font-weight: 700; }

    .suggestion {
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(124,111,247,.08);
      border: 1px solid rgba(124,111,247,.25);
      border-radius: 8px;
      font-size: .8rem;
      color: var(--accent2);
    }
    .suggestion span { cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    .suggestion span:hover { color: var(--text); }

    /* typing indicator */
    .typing .bubble { padding: 14px 18px; }
    .typing-dots { display: flex; gap: 4px; align-items: center; height: 14px; }
    .typing-dots span {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--muted);
      animation: bounce .9s ease-in-out infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: .15s; }
    .typing-dots span:nth-child(3) { animation-delay: .3s; }
    @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }

    /* ── Topics list ── */
    .topics-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
      font-size: .82rem;
    }
    .topics-card h4 { margin-bottom: 8px; color: var(--accent2); font-size: .8rem; font-weight: 600; }
    .topics-card ol { padding-left: 16px; line-height: 2; color: var(--muted); }
    .topics-card li { cursor: pointer; transition: color .15s; }
    .topics-card li:hover { color: var(--text); }

    /* ── Input bar ── */
    footer {
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 14px 20px;
      display: flex;
      gap: 10px;
      align-items: flex-end;
      flex-shrink: 0;
    }
    #user-input {
      flex: 1;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-family: var(--font);
      font-size: .9rem;
      padding: 11px 14px;
      resize: none;
      outline: none;
      transition: border-color .2s;
      min-height: 44px;
      max-height: 120px;
      line-height: 1.5;
    }
    #user-input::placeholder { color: var(--muted); }
    #user-input:focus { border-color: var(--accent); }

    #send-btn {
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border: none;
      border-radius: 10px;
      color: #fff;
      cursor: pointer;
      font-size: .9rem;
      font-weight: 600;
      padding: 11px 20px;
      transition: opacity .2s, transform .1s;
      white-space: nowrap;
    }
    #send-btn:hover { opacity: .9; }
    #send-btn:active { transform: scale(.97); }
    #send-btn:disabled { opacity: .4; cursor: default; }

    #help-btn {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--muted);
      cursor: pointer;
      font-size: .85rem;
      padding: 11px 14px;
      transition: all .2s;
    }
    #help-btn:hover { border-color: var(--accent); color: var(--accent2); }
  </style>
</head>
<body>

<header>
  <div class="logo">&#129302;</div>
  <div>
    <h1>Chart Bot</h1>
    <p>Word Vector FAQ Explorer &mdash; powered by GloVe embeddings</p>
  </div>
  <div class="badge"><span class="dot"></span> Online</div>
</header>

<div class="chips-bar" id="chips">
  <span class="chip" onclick="ask('What is cosine similarity?')">Cosine similarity</span>
  <span class="chip" onclick="ask('What is word2vec?')">Word2Vec</span>
  <span class="chip" onclick="ask('What is GloVe?')">GloVe</span>
  <span class="chip" onclick="ask('Can embeddings be biased?')">Bias in embeddings</span>
  <span class="chip" onclick="ask('What is the parallelogram model?')">Analogies</span>
  <span class="chip" onclick="ask('Difference between sparse and dense vectors?')">Sparse vs Dense</span>
  <span class="chip" onclick="ask('What is a co-occurrence matrix?')">Co-occurrence</span>
  <span class="chip" onclick="ask('How does window size affect embeddings?')">Window size</span>
</div>

<div id="chat-window">
  <div class="msg-row bot">
    <div class="avatar bot">&#129302;</div>
    <div class="bubble">
      <strong>Hey! I'm Chart Bot.</strong><br>
      Ask me anything about word embeddings, cosine similarity, Word2Vec, GloVe, analogies, bias, and more.<br><br>
      I match your question by <em>meaning</em>, not exact words &mdash; so just type naturally!<br>
      Click a chip above or type your own question below.
    </div>
  </div>
</div>

<footer>
  <button id="help-btn" onclick="showTopics()">All topics</button>
  <textarea id="user-input" rows="1" placeholder="Ask about word embeddings..." onkeydown="handleKey(event)"></textarea>
  <button id="send-btn" onclick="sendMessage()">Send &#10148;</button>
</footer>

<script>
const chatWindow = document.getElementById('chat-window');
const input      = document.getElementById('user-input');
const sendBtn    = document.getElementById('send-btn');

// Auto-resize textarea
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
});

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function ask(text) { input.value = text; sendMessage(); }

function scrollBottom() {
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function appendUser(text) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `
    <div class="avatar user">&#128100;</div>
    <div class="bubble">${escHtml(text)}</div>`;
  chatWindow.appendChild(row);
  scrollBottom();
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'msg-row bot typing';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="avatar bot">&#129302;</div>
    <div class="bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  chatWindow.appendChild(row);
  scrollBottom();
  return row;
}

function removeTyping() {
  const t = document.getElementById('typing-row');
  if (t) t.remove();
}

function confColor(pct) {
  if (pct >= 70) return '#3fb950';
  if (pct >= 50) return '#d29922';
  return '#f85149';
}

function appendBot(data) {
  removeTyping();
  const row = document.createElement('div');
  row.className = 'msg-row bot';

  const pct  = Math.round(data.score * 100);
  const col  = confColor(pct);
  const confidence = data.score > 0
    ? `<div class="conf-row">
         <span class="conf-label">Confidence</span>
         <div class="conf-bar-outer">
           <div class="conf-bar-inner" style="width:${pct}%;background:${col}"></div>
         </div>
         <span class="conf-pct" style="color:${col}">${pct}%</span>
       </div>`
    : '';

  const suggestion = data.suggestion
    ? `<div class="suggestion">
         Did you mean: <span onclick="ask(${JSON.stringify(data.suggestion)})">&ldquo;${escHtml(data.suggestion)}&rdquo;</span>?
       </div>`
    : '';

  row.innerHTML = `
    <div class="avatar bot">&#129302;</div>
    <div class="bubble">
      ${confidence}
      ${escHtml(data.answer)}
      ${suggestion}
    </div>`;
  chatWindow.appendChild(row);
  scrollBottom();
}

function appendHelp(topics) {
  removeTyping();
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  const items = topics.map((t, i) =>
    `<li onclick="ask(${JSON.stringify(t)})">${escHtml(t)}</li>`).join('');
  row.innerHTML = `
    <div class="avatar bot">&#129302;</div>
    <div class="bubble">
      <div class="topics-card">
        <h4>All topics I know about (click to ask)</h4>
        <ol>${items}</ol>
      </div>
    </div>`;
  chatWindow.appendChild(row);
  scrollBottom();
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  appendUser(text);
  const typingRow = showTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();

    if (data.topics) {
      appendHelp(data.topics);
    } else {
      appendBot(data);
    }
  } catch {
    removeTyping();
    const row = document.createElement('div');
    row.className = 'msg-row bot';
    row.innerHTML = `<div class="avatar bot">&#129302;</div>
      <div class="bubble" style="color:#f85149">Connection error. Is the server running?</div>`;
    chatWindow.appendChild(row);
    scrollBottom();
  }

  sendBtn.disabled = false;
  input.focus();
}

async function showTopics() {
  appendUser('Show all topics');
  showTyping();
  const res  = await fetch('/topics');
  const data = await res.json();
  appendHelp(data.topics);
}
</script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML_PAGE)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    user_input = (data.get("message") or "").strip()

    if not user_input:
        return jsonify({"answer": "Please type a question.", "score": 0})

    # Help command
    if user_input.lower() in ("help", "topics", "all topics", "show all topics"):
        return jsonify({"topics": [q for q, _ in FAQS]})

    results = query(model, user_input, faq_index, idf, top_k=3)

    if not results:
        return jsonify({
            "answer": "I don't recognise any of those words. Try asking about "
                      "word embeddings, cosine similarity, Word2Vec, or GloVe.",
            "score": 0,
        })

    best_score, best_q, best_a = results[0]

    if best_score < LOW_CONFIDENCE:
        return jsonify({
            "answer": f"I'm not confident about that (best match {best_score:.0%}). "
                      "Try rephrasing, or click 'All topics' to see what I know.",
            "score": round(best_score, 3),
        })

    # Suggest alternative if borderline
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
    print("\n  Chart Bot Web UI")
    print("  Open http://localhost:5000 in your browser\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
