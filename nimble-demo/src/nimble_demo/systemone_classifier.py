import json
import time
import urllib.request


def classify(text, labels):
    # Nimble is not a chat model: we send the state and a question to answer
    body = {
        "model": "nimble",
        "state": text,
        "questions": {
            "label": {
                "type": "choice", # noun | choice | score
                "instructions": "Which kind of request is this?",
                "criteria": labels,
            }
        },
    }
    request = urllib.request.Request(
        "http://localhost:11434/v1/systemone",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )

    start = time.time()
    try:
        with urllib.request.urlopen(request) as response:
            data = json.load(response)
    except Exception as error:
        raise RuntimeError(f"System One call failed: {error}")
    ms = (time.time() - start) * 1000

    answer = data["answers"]["label"]
    lines = [f"confidence: {answer['confidence']:.2f}"]
    # Every option with its probability, highest first
    ranked = sorted(answer["probabilities"].items(), key=lambda item: -item[1])
    for label, probability in ranked:
        lines.append(f"  {label:<9} {probability:.2f}")

    return {"label": answer["choice"], "ms": ms, "details": "\n".join(lines)}
