"""
STAGE 5 (BONUS): Interactive Explorer
========================================
Now that Stages 1-4 showed you how it all works under the hood, this
script gives you a simple menu so you can type in YOUR OWN words and
analogies and see what the model says -- no editing code required.

This is the same GloVe model from Stage 3, and the same vector math
from Stage 4 -- just wrapped in a friendly little command-line loop.

Run this file directly:
    python stage5_interactive.py
"""

from stage3_load_embeddings import load_model
from stage4_analogy_solver import solve_analogy


def print_menu():
    print()
    print("=" * 50)
    print("  Word Vector Explorer")
    print("=" * 50)
    print("1) Find words similar to a word")
    print("2) Solve an analogy (a is to b as a* is to ?)")
    print("3) Quit")


def handle_similarity(model):
    word = input("\nType a word: ").strip().lower()
    if word not in model:
        print(f"Sorry, '{word}' isn't in this model's vocabulary. Try a more common word.")
        return
    print(f"\nWords most similar to '{word}':")
    for neighbor, score in model.most_similar(word, topn=10):
        print(f"  {neighbor:<15} cosine={score:.3f}")


def handle_analogy(model):
    print("\nFormat: a is to b as a* is to ?")
    print("Example: man is to king as woman is to ?")
    a = input("a       (e.g. man):   ").strip().lower()
    b = input("b       (e.g. king):  ").strip().lower()
    a_star = input("a*      (e.g. woman): ").strip().lower()
    solve_analogy(model, a, b, a_star, topn=5)


def main():
    print("Loading the word vector model (first run downloads ~66MB)...")
    model = load_model()

    while True:
        print_menu()
        choice = input("\nChoose an option (1-3): ").strip()

        if choice == "1":
            handle_similarity(model)
        elif choice == "2":
            handle_analogy(model)
        elif choice == "3":
            print("Bye!")
            break
        else:
            print("Please enter 1, 2, or 3.")


if __name__ == "__main__":
    main()
