"""
streamlit_app.py — Chart Bot as a Streamlit web app.

Run:
    streamlit run streamlit_app.py
Then open http://localhost:8501 in your browser.
"""

import math
import re
from collections import Counter

import numpy as np
import streamlit as st

from stage3_load_embeddings import load_model
from faq_data import FAQS

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Chart Bot — Word Vector Explorer",
    page_icon="🤖",
    layout="centered",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

/* Dark background */
.stApp { background: #0d1117; color: #e6edf3; }

/* Header gradient banner */
.hero {
    background: linear-gradient(135deg, #1a1040 0%, #16213e 60%, #0d1117 100%);
    border: 1px solid #30363d;
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
}
.hero-icon { font-size: 2.4rem; }
.hero-title { font-size: 1.4rem; font-weight: 700; color: #e6edf3; }
.hero-sub   { font-size: .82rem; color: #8b949e; margin-top: 3px; }

/* Confidence bar */
.conf-wrap  { margin: 6px 0 10px; }
.conf-label { font-size: .7rem; color: #8b949e; font-weight: 600;
              text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
.conf-bar   { height: 6px; border-radius: 3px; transition: width .5s ease; }
.conf-pct   { font-size: .72rem; font-weight: 700; margin-top: 3px; }

/* Suggestion box */
.suggestion-box {
    margin-top: 10px;
    padding: 9px 13px;
    background: rgba(124,111,247,.1);
    border: 1px solid rgba(124,111,247,.3);
    border-radius: 8px;
    font-size: .82rem;
    color: #a78bfa;
}

/* Topics card */
.topics-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 14px 18px;
    font-size: .84rem;
}
.topics-card h4 { color: #a78bfa; font-size: .8rem; margin-bottom: 8px; }

/* Override Streamlit chat bubble colours */
[data-testid="stChatMessage"] {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
}
</style>
""", unsafe_allow_html=True)


# ── NLP helpers (cached) ──────────────────────────────────────────────────────
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

def clean_and_tokenize(text):
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).split()

def compute_idf(sentences):
    N = len(sentences)
    df = Counter()
    for tokens in sentences:
        for w in set(tokens):
            df[w] += 1
    return {
        word: (0.05 if word in STOP_WORDS else math.log(N / (1 + freq)) + 1.0)
        for word, freq in df.items()
    }

def sentence_vector(model, tokens, idf):
    vecs, weights = [], []
    for w in tokens:
        if w in model:
            wt = idf.get(w, 1.0)
            vecs.append(model[w] * wt)
            weights.append(wt)
    return np.sum(vecs, axis=0) / sum(weights) if vecs else None

def cosine_sim(v1, v2):
    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    return float(np.dot(v1, v2) / denom) if denom > 0 else 0.0


@st.cache_resource(show_spinner="Loading GloVe word vectors (~66 MB, first run only)…")
def load_everything():
    """Load GloVe model + build IDF-weighted FAQ index. Cached across reruns."""
    glove = load_model()
    tokenized = [clean_and_tokenize(q) for q, _ in FAQS]
    idf = compute_idf(tokenized)
    index = [
        {"question": q, "answer": a, "vec": sentence_vector(glove, tokens, idf)}
        for (q, a), tokens in zip(FAQS, tokenized)
    ]
    return glove, index, idf


def query_faq(glove, user_input, faq_index, idf, top_k=3):
    tokens   = clean_and_tokenize(user_input)
    user_vec = sentence_vector(glove, tokens, idf)
    if user_vec is None:
        return []
    scored = [
        (cosine_sim(user_vec, e["vec"]), e["question"], e["answer"])
        for e in faq_index if e["vec"] is not None
    ]
    return sorted(scored, reverse=True)[:top_k]


def conf_html(score):
    """Render an HTML confidence bar."""
    pct = round(score * 100)
    color = "#3fb950" if pct >= 70 else ("#d29922" if pct >= 50 else "#f85149")
    return f"""
    <div class="conf-wrap">
      <div class="conf-label">Confidence</div>
      <div class="conf-bar" style="width:{pct}%;background:{color};max-width:320px"></div>
      <div class="conf-pct" style="color:{color}">{pct}%</div>
    </div>"""


# ── Load model ────────────────────────────────────────────────────────────────
glove, faq_index, idf = load_everything()

# ── Hero banner ───────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
  <div class="hero-icon">🤖</div>
  <div>
    <div class="hero-title">Chart Bot &mdash; Word Vector Explorer</div>
    <div class="hero-sub">Ask me anything about word embeddings, cosine similarity,
    Word2Vec, GloVe, analogies &amp; more.<br>
    I match by <strong>meaning</strong>, not exact keywords &mdash; just type naturally!</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Quick-question chips ──────────────────────────────────────────────────────
QUICK_QUESTIONS = [
    "What is cosine similarity?",
    "What is word2vec?",
    "What is GloVe?",
    "Can embeddings be biased?",
    "What is the parallelogram model?",
    "Difference between sparse and dense vectors?",
    "How does window size affect embeddings?",
    "What is a co-occurrence matrix?",
]

with st.expander("⚡ Quick questions — click to ask", expanded=True):
    cols = st.columns(4)
    for i, q in enumerate(QUICK_QUESTIONS):
        if cols[i % 4].button(q.replace("What is ", "").replace("?", "").title(),
                              key=f"chip_{i}", use_container_width=True):
            st.session_state.pending_question = q

# ── Chat history ──────────────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "👋 **Hi! I'm Chart Bot.**\n\n"
                "Ask me about **word embeddings**, **cosine similarity**, "
                "**Word2Vec**, **GloVe**, **analogies**, **bias**, and more.\n\n"
                "Try a quick question above, or just type below!"
            ),
            "html": None,
        }
    ]

# Render history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"], avatar="🤖" if msg["role"] == "assistant" else "🧑"):
        st.markdown(msg["content"])
        if msg.get("html"):
            st.markdown(msg["html"], unsafe_allow_html=True)

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 📚 All Topics")
    st.caption("Click any topic to ask about it")
    for q, _ in FAQS:
        if st.button(q, key=f"side_{q}", use_container_width=True):
            st.session_state.pending_question = q

    st.divider()
    st.markdown("### ⚙️ Settings")
    conf_thresh = st.slider(
        "Min confidence to answer",
        min_value=0.30, max_value=0.80, value=0.45, step=0.05,
        help="Below this threshold the bot will say it's unsure."
    )
    show_matched = st.checkbox("Show matched FAQ question", value=True)

    st.divider()
    if st.button("🗑️ Clear chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

# ── Handle pending question from chips / sidebar ──────────────────────────────
if "pending_question" in st.session_state:
    pending = st.session_state.pop("pending_question")
    st.session_state._chat_input_override = pending

# ── Chat input ────────────────────────────────────────────────────────────────
user_input = st.chat_input("Ask about word embeddings…")

# Also accept injected question from chips
if not user_input and st.session_state.get("_chat_input_override"):
    user_input = st.session_state.pop("_chat_input_override")

if user_input:
    # Show user message
    st.session_state.messages.append({"role": "user", "content": user_input, "html": None})
    with st.chat_message("user", avatar="🧑"):
        st.markdown(user_input)

    # Generate response
    with st.chat_message("assistant", avatar="🤖"):
        with st.spinner("Thinking…"):
            results = query_faq(glove, user_input, faq_index, idf)

        if not results:
            reply   = "I don't recognise any of those words. Try asking about embeddings, cosine similarity, or GloVe."
            html_extra = None
        else:
            best_score, best_q, best_a = results[0]

            if best_score < conf_thresh:
                reply = (
                    f"I'm not confident about that (**{best_score:.0%}** match). "
                    "Try rephrasing, or pick a topic from the sidebar."
                )
                html_extra = conf_html(best_score)
            else:
                reply = best_a
                if show_matched:
                    reply = f"_{best_q}_\n\n{best_a}"

                html_extra = conf_html(best_score)

                # Suggestion
                if best_score < 0.70 and len(results) > 1:
                    alt_score, alt_q, _ = results[1]
                    if alt_score > conf_thresh:
                        html_extra += f"""
                        <div class="suggestion-box">
                          <strong>Did you mean:</strong> &ldquo;{alt_q}&rdquo;
                          &nbsp;&mdash;&nbsp;{alt_score:.0%} match
                        </div>"""

        st.markdown(reply)
        if html_extra:
            st.markdown(html_extra, unsafe_allow_html=True)

    st.session_state.messages.append({"role": "assistant", "content": reply, "html": html_extra})
