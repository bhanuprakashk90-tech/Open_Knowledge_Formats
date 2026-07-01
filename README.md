# Open Knowledge Format (OKF) & Word Embeddings Explorer

Welcome to the **Open Knowledge Format (OKF) & Word Embeddings Explorer**! This project is an interactive, developer-friendly playground that demonstrates the Google-introduced **Open Knowledge Format (Version 0.1)** and compares it directly with traditional **Retrieval-Augmented Generation (RAG)**. 

It also retains the original word vector exploration suite, allowing you to learn vector semantics, cosine similarity, analogies (using GloVe pre-trained embeddings), and a semantic FAQ chatbot.

---

## ⚡ What is Open Knowledge Format (OKF)?

Introduced by Google Cloud in June 2026, the **Open Knowledge Format (OKF)** is a vendor-neutral specification for representing organizational knowledge. It solves the context-fragmentation problem in LLM-based applications by formalizing the "LLM-wiki" pattern.

### Key Characteristics of OKF:
1. **Plain Text Directories**: An OKF bundle is simply a nested folder structure of standard Markdown (`.md`) files. No proprietary runtimes, databases, or compression formats are required.
2. **YAML Frontmatter**: Every document starts with a metadata block delimited by `---` containing queryable fields. The only required field is `type`.
3. **Structured Interlinking**: Documents reference other concepts, schemas, or playbooks using relative Markdown links (e.g. `[See also](../concepts/billing.md)`), forming a navigable, semantic wiki graph.
4. **Agent-Friendly**: AI agents can crawl this graph natively (following links), maintaining hierarchical context, layout, and instructions without losing connection structure.

---

## ⚖️ OKF vs. Traditional RAG: Why OKF is Better

| Metric | Traditional RAG | Open Knowledge Format (OKF) |
| :--- | :--- | :--- |
| **Mechanics** | Splits text into arbitrary chunks, indexes them in a Vector DB, and pulls fragments via similarity search. | AI agent starts at the root `index.md` and crawls related documents via structured links. |
| **Context Retention** | **Poor.** Chunking shreds tables, splits playbooks, and detaches commands from safety labels. | **Perfect.** Documents are loaded intact, preserving headers, formatting, and relational dependencies. |
| **Hallucination Rate** | **High.** Fragmented context forces LLMs to guess parameters, often outputting incorrect commands. | **Low.** Deterministic graph walks provide complete context, ensuring factual correctness. |
| **Auditability** | **Black-Box.** Difficult to analyze why specific chunks were matching the vector query space. | **High.** The agent's path walk is deterministic, fully traceable, and logged step-by-step. |
| **Compute Cost** | **Expensive.** Requires model inferences for embeddings, vector DB storage, and vector distance mathematics. | **Zero-Compute.** Files are stored as standard Git-versioned markdown; lookup uses simple graph links. |

---

## 🛠️ Web UI Features

Our interactive Web UI coordinates all parts of the application:
1. **Interactive Dashboard**: Provides OKF bundle health metrics, document statistics, keyword tag distributions, and validation scores.
2. **Knowledge Graph**: A canvas-based force-directed graph illustrating documents as colored nodes and Markdown links as directed arrows. Detects broken references (in dashed red) and highlights simulated agent paths.
3. **Document Editor**: A dual-pane Markdown editor with real-time YAML frontmatter validation and live preview. Clicking relative Markdown links in the preview dynamically loads that target file into the editor.
4. **RAG vs. OKF Sandbox**: Illustrates the retrieval path of both paradigms side-by-side. Simulates chunk extraction issues in RAG vs. precise link-walks in OKF.
5. **Agent Navigation Simulator**: Simulates an LLM agent crawling from `index.md` to specific target files, showcasing its reasoning trace at each step.
6. **GloVe Embeddings Playground**: Connects to the pre-trained GloVe vector space (`glove-wiki-gigaword-50`) to find nearest neighbors, solve custom analogies (`a is to b as c is to ?`), and chat with the semantic FAQ bot.

---

## 🚀 Setup & Installation

Ensure you have **Python 3.8+** and **Node.js 18+** installed.

### 1. Python Environment Setup
Activate a virtual environment and install dependencies:
```bash
python -m venv venv
venv\Scripts\activate      # On Windows
source venv/bin/activate   # On macOS / Linux

pip install -r requirements.txt
```
*(PyYAML, Flask, Flask-Cors, and Gensim are required. They will download automatically if not already installed).*

### 2. Node.js Environment Setup
In the root directory, install npm packages:
```bash
npm install
```

---

## 🏃 How to Run the Application

### Development Mode (Recommended)
To run both the Python Flask backend and the Vite-React frontend dev server concurrently:
```bash
npm run dev
```
Then open **http://localhost:5173** in your browser. This includes Hot-Module-Replacement for frontend changes.

### Production Mode (Single Server)
If you want to compile the frontend and run the entire application from the Flask Python server:
```bash
# 1. Compile the React build
npm run build

# 2. Start the Flask server
python web_app.py
```
Then open **http://localhost:5000** in your browser. Flask serves the static compiled frontend assets from `dist/` and runs all API endpoints on port 5000.

---

## 📂 OKF Schema Reference

For the sample bundle located under `knowledge/`, here is the standard schema convention:

```yaml
---
type: concept | playbook | schema | index  # REQUIRED
title: Display Name                         # OPTIONAL
description: Brief one-line summary         # OPTIONAL
resource: service-uri://path                # OPTIONAL (e.g. database schema key, pod uri)
tags:                                       # OPTIONAL
  - tag-name
  - category
timestamp: 2026-07-01T02:00:00Z             # OPTIONAL (ISO 8601 format)
---
```

### Example Folder Structure:
- `knowledge/index.md` (Bundle entry point)
- `knowledge/concepts/` (System overviews, service documentation)
- `knowledge/playbooks/` (SRE troubleshooting guides, runbooks)
- `knowledge/schemas/` (Database schemas, API model definitions)

### Co-Authors
- Bhanuprakash (Lead Developer)
- Antigravity (AI Pair-Programming Assistant)
