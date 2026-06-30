"""
STAGE 2: Cosine Similarity (from scratch)
==========================================
From the slides (pg 46-53): "Computing word similarity: Dot product
and cosine".

Problem (pg 48): raw dot product favors LONG vectors -> frequent
words look "similar" to everything just because they have big
numbers, not because they're actually related.

Fix (pg 49): normalize the dot product by the length of each
vector. That's the cosine similarity formula:

    cosine(v, w) = (v . w) / (|v| * |w|)

This file recreates the exact example from slide page 51
(cherry/digital/information, using pie/data/computer counts),
then reuses Stage 1's matrix to compute similarities on our toy
corpus.

Run this file directly:
    python stage2_cosine_similarity.py
"""

import math
from stage1_cooccurrence import build_cooccurrence_matrix, CORPUS


def dot_product(v, w):
    """v . w = sum(v_i * w_i)   -- slide page 47, Eq 6.7"""
    return sum(vi * wi for vi, wi in zip(v, w))


def vector_length(v):
    """|v| = sqrt(sum(v_i^2))   -- slide page 48, Eq 6.8"""
    return math.sqrt(sum(vi ** 2 for vi in v))


def cosine_similarity(v, w):
    """
    cosine(v, w) = (v . w) / (|v| * |w|)   -- slide page 49, Eq 6.10

    Returns a value in [0, 1] for non-negative count vectors:
      1   -> vectors point the same direction (very similar)
      0   -> vectors are orthogonal (unrelated)
    """
    denom = vector_length(v) * vector_length(w)
    if denom == 0:
        return 0.0
    return dot_product(v, w) / denom


def reproduce_slide_example():
    """
    Recreates the worked example on slide page 51:

                pie   data   computer
    cherry      442     8       2
    digital       5  1683    1670
    information    5  3982    3325

    Expected results (from the slide):
        cos(cherry, information)  ~= 0.017
        cos(digital, information) ~= 0.996
    """
    cherry = [442, 8, 2]
    digital = [5, 1683, 1670]
    information = [5, 3982, 3325]

    print("Reproducing the worked example from slide page 51:")
    print(f"  cos(cherry, information)  = {cosine_similarity(cherry, information):.3f}  (slide says ~0.017)")
    print(f"  cos(digital, information) = {cosine_similarity(digital, information):.3f}  (slide says ~0.996)")
    print()
    print("--> 'information' is far closer in meaning to 'digital' than to")
    print("    'cherry', even though raw counts for 'information' are much")
    print("    bigger than for 'cherry' -- cosine cancels out vector length,")
    print("    exactly the problem described on slide page 48.")


def compare_with_our_corpus():
    """Use Stage 1's co-occurrence matrix on our own toy corpus."""
    matrix, vocab = build_cooccurrence_matrix(CORPUS)

    def vec(word):
        # turn the row dict into an ordered vector over the full vocab
        return [matrix[word][c] for c in vocab]

    pairs_to_check = [
        ("cherry", "strawberry"),   # expect: similar (both fruit/pie words)
        ("digital", "information"), # expect: similar (both computer words)
        ("cherry", "digital"),      # expect: NOT similar
    ]

    print()
    print("Cosine similarities on OUR toy corpus (from Stage 1):")
    for w1, w2 in pairs_to_check:
        sim = cosine_similarity(vec(w1), vec(w2))
        print(f"  cos({w1:<10}, {w2:<12}) = {sim:.3f}")


if __name__ == "__main__":
    reproduce_slide_example()
    compare_with_our_corpus()
