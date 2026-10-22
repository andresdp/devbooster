import json
import time
import urllib.request

def classify(text, labels):
    # Build a prompt that lists the labels and asks for ONLY the label
    lines = [f"- {label}: {description}" for label, description in labels.items()]
    prompt = (
        "Classify the user's request into exactly one of these labels:\n"
        + "\n".join(lines)
        + "\nReply with ONLY the label.\n\nRequest: "
        + text
    )

    body = {
        "model": "qwen3.6:35b-a3b-q4_K_M",
        "stream": False,
        "think": False,  # remove this line if the model does not support it
        "messages": [{"role": "user", "content": prompt}],
    }
    request = urllib.request.Request(
        "http://localhost:11434/api/chat",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )

    start = time.time()
    try:
        with urllib.request.urlopen(request) as response:
            data = json.load(response)
    except Exception as error:
        raise RuntimeError(f"LLM call failed: {error}")
    ms = (time.time() - start) * 1000

    raw = data["message"]["content"]
    # Normalize: strip spaces, lowercase, remove trailing punctuation
    label = raw.strip().lower().rstrip(".,!?:;\"'` ")
    if label not in labels:
        label = "UNPARSEABLE"  # the model did not follow the instructions

    return {"label": label, "ms": ms, "details": "raw answer: " + repr(raw)}
