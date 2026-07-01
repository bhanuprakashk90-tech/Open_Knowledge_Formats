"""
STAGE 4: Analogy Solver (Parallelogram Model)
================================================
From the slides (pg 86-89): "Analogical relations via parallelogram".

To solve "a is to b as a* is to ___?" (e.g. "man is to king as woman
is to ___?"), the classic trick (Rumelhart & Abrahamson 1973) is
vector arithmetic:

    answer = b - a + a*

Then find the real word whose vector is closest to that point.

Famous examples from the slides (pg 87):
    king - man + woman   ~=  queen
    Paris - France + Italy ~= Rome

This script reuses the same GloVe model from Stage 3.

Run this file directly:
    python stage4_analogy_solver.py
"""

from stage3_load_embeddings import load_model


def solve_analogy(model, a, b, a_star, topn=5):
    """
    Solve: a is to b as a_star is to ___?
    i.e.   a* + (b - a)

    gensim's most_similar(positive=[...], negative=[...]) does
    exactly this vector arithmetic for us:
        positive words are ADDED, negative words are SUBTRACTED.

    For "man:king :: woman:?" we want   king - man + woman
        positive = [king, woman]
        negative = [man]
    """
    for word in (a, b, a_star):
        if word not in model:
            print(f"'{word}' not in vocabulary, skipping.")
            return

    print(f"\n'{a}' is to '{b}' as '{a_star}' is to ___?")
    print(f"  (computing: {b} - {a} + {a_star})")
    results = model.most_similar(positive=[b, a_star], negative=[a], topn=topn)
    for word, score in results:
        print(f"  -> {word:<15} cosine={score:.3f}")


if __name__ == "__main__":
    model = load_model()

    # The classic examples straight from slide page 87
    solve_analogy(model, "man", "king", "woman")        # expect: queen
    solve_analogy(model, "france", "paris", "italy")    # expect: rome

    # A couple more to try the idea yourself (pg 86: apple:tree::grape:vine)
    solve_analogy(model, "tree", "apple", "vine")        # expect: grape-ish
    solve_analogy(model, "good", "best", "bad")          # expect: worst

    print("\nTry your own! Edit the calls above, or import solve_analogy()")
    print("in your own script: solve_analogy(model, 'a', 'b', 'a_star')")
