from nimble_demo import llm_classifier
from nimble_demo import systemone_classifier

LABELS = {
    "debug": "The user wants to find and fix an error",
    "refactor": "The user wants to improve or restructure existing code",
    "explain": "The user wants to understand how some code works",
    "document": "The user wants docs, comments or a README written",
}

while True:
    text = input("Your request (empty to exit): ").strip()
    if text == "":
        break

    choice = input("Engine: 1) llm  2) systemone > ").strip()
    module = llm_classifier if choice == "1" else systemone_classifier

    try:
        result = module.classify(text, LABELS)
    except RuntimeError as error:
        print(f"{error} -- is Ollama running? Start it with `ollama serve`.")
        continue

    print("label:", result["label"])
    print("ms:", round(result["ms"], 1))
    print(result["details"])
