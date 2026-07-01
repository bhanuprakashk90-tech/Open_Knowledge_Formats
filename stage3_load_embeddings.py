"""
STAGE 3: Real Pretrained Embeddings (GloVe)
=============================================
From the slides (pg 54-58): "Sparse versus dense vectors" and
"Simple static embeddings you can download". Our toy co-occurrence
vectors from Stage 1 are tiny and sparse (length 23, mostly zero).
Real embeddings are DENSE and SHORT (length 50-300, pg 55) and are
trained on billions of words.

This script downloads a small pretrained GloVe model (50-dimensional,
trained on Wikipedia) using the `gensim` library, then lets you find
the nearest neighbors of any word -- just like the slide's example
on page 28 (sweet -> candy, chocolate, cream, honey...).

NOTE: the first time you run this, it will download ~66MB of vectors.
That needs an internet connection on YOUR machine (this is normal --
this is the actual GloVe file from Stanford, served via gensim).

Run this file directly:
    python stage3_load_embeddings.py
"""

import gensim.downloader as api

MODEL_NAME = "glove-wiki-gigaword-50"  # 50-dim GloVe vectors, ~66MB


def load_model():
    print(f"Loading '{MODEL_NAME}' (downloads automatically the first time)...")
    model = api.load(MODEL_NAME)
    print(f"Loaded! Vocabulary size: {len(model.index_to_key):,} words, "
          f"each a {model.vector_size}-dimensional dense vector.")
    return model


def show_nearest_neighbors(model, word, topn=8):
    """
    Uses gensim's built-in cosine-similarity search -- the exact same
    math you wrote by hand in Stage 2, just running over a much
    bigger, denser vocabulary.
    """
    if word not in model:
        print(f"'{word}' not in vocabulary.")
        return
    print(f"\nWords most similar to '{word}' (compare to slide page 28):")
    for neighbor, score in model.most_similar(word, topn=topn):
        print(f"  {neighbor:<15} cosine={score:.3f}")


def show_window_size_effect(model):
    """
    The slides note (pg 85) that small training windows give
    syntactically-similar neighbors, while large windows give
    broader semantic/topic neighbors. We can't change GloVe's
    window after the fact, but we CAN illustrate the same idea
    Hogwarts-style with whatever's in this vocabulary.
    """
    for word in ["hogwarts", "harry"]:
        if word in model:
            show_nearest_neighbors(model, word, topn=6)


if __name__ == "__main__":
    model = load_model()

    for word in ["sweet", "computer", "king", "happy"]:
        show_nearest_neighbors(model, word)

    print("\n--- Bonus: words from the slides' own examples ---")
    show_window_size_effect(model)
