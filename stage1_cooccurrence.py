"""
STAGE 1: Word-Context (Co-occurrence) Matrix
==============================================
From the slides (pg 35-44): "Word-context matrix" / "word-word
co-occurrence matrix".

Idea: count how often each word appears near each other word
within a window (e.g. +/- 4 words). This gives every word a
ROW VECTOR of counts. Words with similar neighbors -> similar
meaning.

This is the "sparse, count-based" embedding from the slides
(pg 31, 44, 55).

Run this file directly:
    python stage1_cooccurrence.py
"""

from collections import defaultdict
import pprint

# A tiny toy corpus, inspired by the cherry/strawberry/digital/information
# example on slide pages 38-42 of the lecture.
CORPUS = [
    "cherry pie has lots of sugar",
    "strawberry pie also has sugar",
    "the computer stores digital data",
    "computer systems process digital information",
    "cherry and strawberry pie taste sweet with sugar",
    "digital information is data on a computer",
    "the computer stores digital data and information",
]

WINDOW_SIZE = 4  # words to the left/right, matching the slides' example


def tokenize(corpus):
    """Split each sentence into a list of lowercase words."""
    return [sentence.lower().split() for sentence in corpus]


def build_cooccurrence_matrix(corpus, window_size=WINDOW_SIZE):
    """
    Build a word -> {context_word: count} co-occurrence matrix.

    For every word in every sentence, look at `window_size` words
    to the left and right, and count them as "context words".
    """
    sentences = tokenize(corpus)

    # vocabulary = every unique word seen
    vocab = sorted({word for sentence in sentences for word in sentence})

    # matrix[word][context_word] = count
    matrix = {word: defaultdict(int) for word in vocab}

    for sentence in sentences:
        for i, word in enumerate(sentence):
            start = max(0, i - window_size)
            end = min(len(sentence), i + window_size + 1)
            for j in range(start, end):
                if j == i:
                    continue  # don't count the word itself
                context_word = sentence[j]
                matrix[word][context_word] += 1

    return matrix, vocab


def print_mini_matrix(matrix, words, contexts):
    """Pretty-print a small slice of the matrix, like Fig 5.2/6.6 in the slides."""
    header = "          " + "".join(f"{c:>12}" for c in contexts)
    print(header)
    for w in words:
        row = "".join(f"{matrix[w][c]:>12}" for c in contexts)
        print(f"{w:<10}{row}")


if __name__ == "__main__":
    matrix, vocab = build_cooccurrence_matrix(CORPUS)

    print(f"Vocabulary ({len(vocab)} words):")
    print(vocab)
    print()

    # Recreate something like the slides' mini-matrix (pg 40-42):
    # rows = cherry, strawberry, digital, information
    # cols = a few interesting context words
    words_of_interest = ["cherry", "strawberry", "digital", "information"]
    context_of_interest = ["pie", "computer", "data", "sugar"]

    print("Mini word-context matrix (compare to slide pages 40-42):")
    print_mini_matrix(matrix, words_of_interest, context_of_interest)

    print()
    print("Full row vector for 'cherry':")
    pprint.pprint(dict(matrix["cherry"]))

    print()
    print("--> Notice 'cherry' and 'strawberry' share contexts like 'pie' and")
    print("    'sugar', while 'digital' and 'information' share 'computer' and")
    print("    'data'. This is exactly the intuition from slide page 38:")
    print("    words with similar neighborhoods have similar meaning.")
