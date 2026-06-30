# Word Similarity & Analogy Explorer

A beginner-friendly project that walks through the **Vector Semantics &
Embeddings** lecture slides, stage by stage. You'll go from counting
words by hand to using real pretrained embeddings, solving analogies,
and finally running an interactive FAQ chatbot with a web UI.

No deep ML background needed — just run the scripts in order and read
the comments. Each one prints out what's happening and ties it back to
a specific slide.

## What you'll build

| Stage | File | What it does | Concept |
|---|---|---|---|
| 1 | `stage1_cooccurrence.py` | Counts how often words appear near each other in a tiny made-up corpus | Word-context matrix (pg 35-44) |
| 2 | `stage2_cosine_similarity.py` | Implements cosine similarity **from scratch** (just math, no libraries) | Cosine similarity (pg 46-53) |
| 3 | `stage3_load_embeddings.py` | Downloads and loads real pretrained GloVe word vectors | Dense embeddings / word2vec (pg 54-58) |
| 4 | `stage4_analogy_solver.py` | Solves analogies using vector arithmetic | Parallelogram model (pg 86-89) |
| 5 (bonus) | `stage5_interactive.py` | A simple menu to type in **your own** words and analogies, no code editing needed | Ties Stages 3-4 together interactively |
| 6 (bonus) | `chatbot.py` + `faq_data.py` | An FAQ chatbot that matches your question to the closest known question **by meaning**, not exact wording | IDF-weighted sentence vectors + cosine similarity |
| 7 (bonus) | `streamlit_app.py` | Full **web UI** for the chatbot — dark theme, confidence bars, topic sidebar, live threshold slider | Streamlit |
| — | `web_app.py` | Alternative Flask REST API + HTML chat UI | Flask |

## Setup

1. Make sure you have Python 3.8+ installed.
2. Open a terminal in this folder.
3. (Recommended) create a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate      # Windows
   source venv/bin/activate   # macOS / Linux
   ```
4. Install all dependencies:
   ```
   pip install -r requirements.txt
   ```
   (Stages 1-2 use only Python's standard library — nothing to install.)

## How to run it

Run the stages **in order** — each one builds on the idea before it.

### Stage 1 — Count co-occurrences by hand
```
python stage1_cooccurrence.py
```
Builds a tiny "word-context matrix" from a handful of made-up sentences.
You'll see that `cherry` and `strawberry` share contexts like `pie` and
`sugar`, while `digital` and `information` share `computer` and `data` —
**words with similar neighbors have similar meaning.**

### Stage 2 — Cosine similarity from scratch
```
python stage2_cosine_similarity.py
```
Reproduces the exact worked example from the slides (cherry vs. digital vs.
information) and shows why raw dot products are misleading and why dividing
by vector length (cosine) fixes it. Then reuses Stage 1's data.

### Stage 3 — Real pretrained embeddings
```
python stage3_load_embeddings.py
```
Downloads a small GloVe model (~66 MB, one-time) trained on Wikipedia and
shows the nearest neighbors of words like `sweet`, `king`, and `computer`.

> First run needs an internet connection. After that it's cached locally.

### Stage 4 — Solve analogies
```
python stage4_analogy_solver.py
```
Using simple vector arithmetic (`king - man + woman`), finds the closest
real word — `queen`. Also tries `Paris - France + Italy` → `Rome`.

### Stage 5 (bonus) — Interactive terminal explorer
```
python stage5_interactive.py
```
A simple command-line menu to find similar words and solve your own analogies
without editing any code.

```
1) Find words similar to a word
2) Solve an analogy (a is to b as a* is to ?)
3) Quit
```

### Stage 6 (bonus) — Chart Bot (terminal FAQ chatbot)
```
python chatbot.py
```
A chatbot that answers questions about word embeddings by **meaning**, not
keyword matching.

**How it works:**
- Each FAQ question (`faq_data.py`) gets an IDF-weighted sentence vector
  (average of its GloVe word vectors, with rare/content words weighted higher).
- Your question gets the same treatment, then cosine similarity finds the
  closest FAQ.
- Result: typing *"whats a synonym mean"* still matches *"What does it mean
  for two words to be synonyms?"* — even with different wording.

Features:
- **IDF weighting** — stop-words like "what", "is", "a" don't dominate
- **Top-3 candidates** — finds best match plus a "did you mean?" fallback
- **Confidence bar** — shows how sure the bot is (`█████ 92%`)
- **24 FAQ topics** covering all key concepts in the lecture slides
- Type `help` to list all topics

### Stage 7 (bonus) — Streamlit Web UI
```
streamlit run streamlit_app.py
```
Then open **http://localhost:8501** in your browser.

A full web chat interface built with Streamlit:

| Feature | Details |
|---|---|
| Dark chat UI | GitHub-dark theme, animated message bubbles |
| Quick-chips | 8 one-click question buttons at the top |
| Confidence bar | Colour-coded: green ≥70% · yellow ≥50% · red <50% |
| "Did you mean?" | Suggests a closer FAQ if match is borderline |
| Topic sidebar | Every FAQ listed as a clickable button |
| Confidence slider | Tune the answer threshold live (0.30–0.80) |
| Clear chat | Reset conversation in one click |

### Alternative — Flask web app
```
python web_app.py
```
Then open **http://localhost:5000**. A lightweight Flask REST API + HTML
chat page — no framework install needed beyond Flask.

## Things to try next (optional extensions)

- **Bigger toy corpus**: add sentences to `CORPUS` in `stage1_cooccurrence.py`
- **Different window sizes**: change `WINDOW_SIZE` in Stage 1 (pg 85)
- **Your own analogies**: edit Stage 4 to test custom analogies
- **Bias exploration**: try analogies like `man:programmer :: woman:?` (pg 91)
- **Bigger GloVe model**: change `MODEL_NAME` to `"glove-wiki-gigaword-300"`
- **Extend the chatbot**: add more `(question, answer)` pairs to `faq_data.py`

## Why this matters (the short version)

- **Stage 1-2** show the *original* idea: meaning = "what words show up nearby"
  (Firth/Harris distributional hypothesis, pg 22), measured with counting + cosine.
- **Stage 3-4** show the *modern* version: dense word2vec/GloVe vectors that
  capture gender, country↔capital, and many other relations.
- **Stage 6-7** show a *real-world application*: semantic search / FAQ matching,
  the same technique used in production search engines and chatbots.

That's the whole story of the lecture in one runnable project.
