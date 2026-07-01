"""
FAQ data for the chatbot.
Each entry is a (question, answer) pair. The chatbot matches the
user's question to the closest entry here using word-vector similarity,
so you don't have to type the exact question.

Add as many entries as you like — no other code changes needed.
"""

FAQS = [
    # ── Core concepts ─────────────────────────────────────────────────────────
    (
        "What is a word embedding?",
        "A word embedding is a vector (a list of numbers) that represents "
        "a word's meaning based on the words that tend to appear near it. "
        "Similar words end up with similar vectors.",
    ),
    (
        "What is cosine similarity?",
        "Cosine similarity measures how similar two vectors are by looking "
        "at the angle between them, ignoring their length. It ranges from "
        "0 (completely unrelated) to 1 (identical direction) for word-count vectors.",
    ),
    (
        "What is the distributional hypothesis?",
        "The distributional hypothesis (Firth/Harris) says: 'You shall know "
        "a word by the company it keeps.' Words that appear in similar "
        "contexts tend to have similar meanings — this is the foundation of "
        "all word vector methods.",
    ),
    (
        "What is a co-occurrence matrix?",
        "A co-occurrence matrix counts how often each word appears near "
        "every other word in a corpus, within a sliding window. Each row "
        "becomes a sparse vector representing a word's meaning.",
    ),
    (
        "What is the difference between sparse and dense vectors?",
        "Sparse vectors (like raw co-occurrence counts) are very long and "
        "mostly zero. Dense vectors (like word2vec or GloVe) are short "
        "(50–300 numbers) and mostly non-zero. Dense vectors usually work "
        "better because they generalise to unseen contexts.",
    ),
    (
        "What does it mean for two words to be synonyms?",
        "Synonyms are words with the same or very similar meaning in some "
        "contexts, like 'couch' and 'sofa'. True perfect synonyms are rare; "
        "words usually differ in connotation or register.",
    ),

    # ── Models ────────────────────────────────────────────────────────────────
    (
        "What is word2vec?",
        "Word2vec is a neural method that learns dense word embeddings by "
        "training a classifier to predict whether two words tend to appear "
        "near each other in text. It comes in two flavours: skip-gram and CBOW.",
    ),
    (
        "What is the skip-gram model?",
        "Skip-gram is the word2vec approach that trains a classifier to "
        "predict the context words around a given target word. It works well "
        "for rare words because each occurrence is a separate training signal.",
    ),
    (
        "What is CBOW?",
        "CBOW (Continuous Bag of Words) is the word2vec approach that "
        "predicts a target word from its surrounding context words. It is "
        "faster to train than skip-gram but slightly less accurate for "
        "infrequent words.",
    ),
    (
        "What is GloVe?",
        "GloVe (Global Vectors) is a popular set of pretrained word "
        "embeddings trained on large corpora like Wikipedia. It combines "
        "count-based co-occurrence statistics with a neural objective, and "
        "is free to download.",
    ),
    (
        "What is PPMI?",
        "PPMI (Positive Pointwise Mutual Information) reweights raw "
        "co-occurrence counts to highlight word pairs that co-occur much "
        "more than you'd expect by chance, discarding negative associations.",
    ),
    (
        "What is TF-IDF?",
        "TF-IDF (Term Frequency–Inverse Document Frequency) weights a word "
        "by how often it appears in a document versus how common it is across "
        "all documents. Rare but frequent-in-context words get higher weight.",
    ),

    # ── Analogies & structure ─────────────────────────────────────────────────
    (
        "What is the parallelogram model?",
        "The parallelogram model solves analogies like 'man is to king as "
        "woman is to ?' using vector arithmetic: king − man + woman. The "
        "closest real word to that point is the answer (usually 'queen').",
    ),
    (
        "How does vector arithmetic capture relationships?",
        "Because similar contexts produce similar vectors, directional "
        "differences like (king − man) encode a relational concept (royalty). "
        "Adding that direction to another word (woman) moves it in the same "
        "relational direction, landing near 'queen'.",
    ),
    (
        "What kinds of analogies do word vectors solve?",
        "Word vectors work best for frequent words and systematic relations "
        "like country→capital (France:Paris :: Italy:Rome) or gender pairs "
        "(king:queen :: man:woman). They struggle with rare words or complex "
        "abstract relations.",
    ),

    # ── Context window ────────────────────────────────────────────────────────
    (
        "What is a context window?",
        "A context window defines how many words to the left and right of "
        "a target word count as 'context'. Typical sizes are 2–10 words. "
        "Smaller windows capture syntactic relations; larger windows capture "
        "topical or semantic ones.",
    ),
    (
        "How does window size affect embeddings?",
        "Small windows (±2) give syntactically similar neighbours — e.g. "
        "adjectives cluster together. Large windows (±10) give topically "
        "related neighbours — words that appear in the same documents even "
        "if not adjacent.",
    ),

    # ── Bias ──────────────────────────────────────────────────────────────────
    (
        "Can word embeddings be biased?",
        "Yes. Embeddings are trained on text written by real people, so they "
        "pick up cultural biases — e.g. associating 'doctor' more with 'man' "
        "and 'nurse' with 'woman'. This is important to be aware of when "
        "using embeddings in real applications.",
    ),
    (
        "How can we reduce bias in word embeddings?",
        "Researchers have proposed debiasing techniques such as projecting "
        "out the gender direction from the embedding space, or retraining on "
        "more balanced corpora. No method is perfect, and measuring bias "
        "itself is an active research area.",
    ),

    # ── Practical ─────────────────────────────────────────────────────────────
    (
        "What can you use word embeddings for?",
        "Word embeddings are used in sentiment analysis, machine translation, "
        "question answering, chatbots, document clustering, recommendation "
        "systems, and many more NLP tasks. They give models a head start by "
        "providing pre-learned semantic knowledge.",
    ),
    (
        "How do you choose the right embedding model?",
        "For most tasks, start with a pretrained model like GloVe or "
        "fastText. Use 50–100 dimensions for speed, 300 for quality. If you "
        "have domain-specific text (e.g. medical), consider training or "
        "fine-tuning on that corpus.",
    ),
    (
        "What is the difference between word2vec and BERT?",
        "Word2vec produces a single static vector per word regardless of "
        "context. BERT (and similar transformer models) produce dynamic, "
        "context-dependent vectors — the word 'bank' gets different vectors "
        "in 'river bank' vs 'bank account'. BERT is more powerful but much "
        "heavier to run.",
    ),
    (
        "What is a sentence vector or document embedding?",
        "A sentence vector represents a whole sentence (or document) as a "
        "single vector. A simple approach is to average the word vectors "
        "of all words in the sentence. More advanced methods use transformer "
        "models like Sentence-BERT.",
    ),
]
