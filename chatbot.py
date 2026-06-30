"""
STAGE 6 (BONUS): Chart Bot — FAQ chatbot powered by word vectors
=================================================================
This ties everything together into something genuinely useful: a
chatbot that answers questions by MEANING, not exact wording.

Improvements over the basic version
-------------------------------------
* IDF weighting: rare/content words count more than stop-words like
  "what", "is", "a" when building sentence vectors.
* Top-3 candidates: we find the three closest FAQ matches and only
  use the best one — but if it's borderline we show a "did you mean?"
  suggestion so the user can refine.
* Conversation history: the bot remembers what you already asked and
  won't repeat the same answer twice in a row.
* Cleaner confidence display with a visual bar.

How it works
------------
1. faq_data.py holds (question, answer) pairs.
2. We compute an IDF-weighted sentence vector for every FAQ question.
3. When you type a question we do the same, then cosine-compare
   against all FAQ vectors (same math as Stage 2!).
4. High confidence  → answer immediately.
   Borderline        → answer + show "did you mean?" alternative.
   Low confidence    → politely decline and suggest rephrasing.

Run:
    python chatbot.py
"""

import math
import re
from collections import Counter

import numpy as np

from stage3_load_embeddings import load_model
from faq_data import FAQS

# ── Thresholds ────────────────────────────────────────────────────────────────
HIGH_CONFIDENCE   = 0.70   # answer directly
LOW_CONFIDENCE    = 0.45   # refuse to answer
# between LOW and HIGH we answer but show a "did you mean?" alternative

# ── Stop-words to downweight in IDF ──────────────────────────────────────────
STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "of", "in", "on",
    "at", "to", "for", "with", "by", "from", "up", "about", "into",
    "through", "during", "before", "after", "above", "below", "between",
    "out", "off", "over", "under", "again", "then", "once", "what",
    "how", "why", "when", "where", "who", "which", "that", "this",
    "it", "its", "i", "me", "my", "we", "our", "you", "your",
    "he", "she", "they", "them", "their", "and", "but", "or", "so",
    "if", "as", "than", "because", "while", "just", "also",
}


# ── Text helpers ──────────────────────────────────────────────────────────────
def clean_and_tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split into words."""
    text = re.sub(r"[^a-z0-9\s]", "", text.lower())
    return text.split()


def compute_idf(all_sentences: list[list[str]]) -> dict[str, float]:
    """
    IDF(word) = log( N / (1 + df(word)) )
    where df is the number of sentences containing that word.
    Stop-words get an artificially low IDF so they barely influence
    the sentence vector.
    """
    N = len(all_sentences)
    df: Counter = Counter()
    for tokens in all_sentences:
        for word in set(tokens):
            df[word] += 1

    idf: dict[str, float] = {}
    for word, freq in df.items():
        if word in STOP_WORDS:
            idf[word] = 0.05            # nearly zero weight for stop-words
        else:
            idf[word] = math.log(N / (1 + freq)) + 1.0   # smoothed
    return idf


def sentence_vector(model, tokens: list[str], idf: dict[str, float]):
    """
    IDF-weighted average of word vectors.
    Words not in the GloVe vocab are skipped.
    """
    vecs, weights = [], []
    for word in tokens:
        if word in model:
            w = idf.get(word, 1.0)
            vecs.append(model[word] * w)
            weights.append(w)
    if not vecs:
        return None
    return np.sum(vecs, axis=0) / sum(weights)


def cosine_sim(v1, v2) -> float:
    """Cosine similarity — same formula as Stage 2, using numpy."""
    denom = np.linalg.norm(v1) * np.linalg.norm(v2)
    return float(np.dot(v1, v2) / denom) if denom > 0 else 0.0


def confidence_bar(score: float, width: int = 20) -> str:
    """ASCII progress bar for confidence score."""
    filled = round(score * width)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {score:.0%}"


# ── Build FAQ index ───────────────────────────────────────────────────────────
def build_faq_index(model, faqs):
    """
    Tokenize every FAQ question, compute IDF over that corpus, then
    produce a (question, answer, vector) triple for each FAQ.
    """
    tokenized = [clean_and_tokenize(q) for q, _ in faqs]
    idf = compute_idf(tokenized)

    index = []
    for (question, answer_text), tokens in zip(faqs, tokenized):
        vec = sentence_vector(model, tokens, idf)
        index.append({
            "question": question,
            "answer":   answer_text,
            "tokens":   tokens,
            "vec":      vec,
        })
    return index, idf


# ── Query ────────────────────────────────────────────────────────────────────
def query(model, user_input: str, faq_index, idf, top_k: int = 3):
    """
    Rank all FAQs by cosine similarity and return the top-k results
    as a list of (score, question, answer) tuples, best first.
    """
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


# ── Main chat loop ────────────────────────────────────────────────────────────
def main():
    print("\nLoading the word vector model (first run downloads ~66MB)...")
    model = load_model()
    faq_index, idf = build_faq_index(model, FAQS)

    print()
    print("=" * 57)
    print("  [Chart Bot]  ask me about word embeddings!")
    print("=" * 57)
    print("  You don't need exact wording. Try things like:")
    print("    • 'whats cosine similarity'")
    print("    • 'are embeddings ever unfair'")
    print("    • 'how does word2vec learn'")
    print("  Type 'help' to see all topics, 'quit' to exit.")
    print("=" * 57)

    last_answer = None   # prevent identical answers back-to-back

    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBot: Bye!")
            break

        if not user_input:
            continue

        low = user_input.lower()

        # ── Special commands ──────────────────────────────────────────────
        if low in ("quit", "exit", "q", "bye"):
            print("Bot: Bye! Happy learning.")
            break

        if low == "help":
            print("\nBot: Here are the topics I know about:")
            for i, (q, _) in enumerate(FAQS, 1):
                print(f"  {i:2}. {q}")
            continue

        # ── Semantic search ───────────────────────────────────────────────
        results = query(model, user_input, faq_index, idf)

        if not results:
            print("Bot: I don't recognise any of those words, sorry!")
            print("     Try 'help' to see topics I can discuss.")
            continue

        best_score, best_q, best_a = results[0]

        # ── Low confidence → refuse ───────────────────────────────────────
        if best_score < LOW_CONFIDENCE:
            print(f"Bot: I'm not confident about that "
                  f"(best match {confidence_bar(best_score)}).")
            print("     Try rephrasing, or type 'help' to see all topics.")
            continue

        # ── Avoid exact repeat ────────────────────────────────────────────
        if best_a == last_answer and len(results) > 1:
            best_score, best_q, best_a = results[1]

        # ── Answer ────────────────────────────────────────────────────────
        print(f"\nBot {confidence_bar(best_score)}:")
        print(f"  {best_a}")

        # ── Borderline → suggest alternative ─────────────────────────────
        if best_score < HIGH_CONFIDENCE and len(results) > 1:
            alt_score, alt_q, _ = results[1]
            if alt_score > LOW_CONFIDENCE:
                print(f"\n  >> Did you mean: \"{alt_q}\"?")
                print(f"     (similarity {confidence_bar(alt_score)})")
                print("     Type 'yes' to see that answer instead.")

        last_answer = best_a

        # ── Shortcut: let user say 'yes' to see the alternative ──────────
        follow = input("\nYou: ").strip().lower()
        if follow in ("yes", "y"):
            if len(results) > 1:
                score2, q2, a2 = results[1]
                print(f"\nBot {confidence_bar(score2)}:")
                print(f"  {a2}")
                last_answer = a2
        elif follow:
            # treat as a new question
            results2 = query(model, follow, faq_index, idf)
            if results2:
                s, q2, a2 = results2[0]
                if s >= LOW_CONFIDENCE:
                    print(f"\nBot {confidence_bar(s)}:")
                    print(f"  {a2}")
                    last_answer = a2
                else:
                    print(f"Bot: Not sure about that one either "
                          f"(similarity {confidence_bar(s)}).")
            else:
                print("Bot: I don't recognise those words, sorry!")


if __name__ == "__main__":
    main()
