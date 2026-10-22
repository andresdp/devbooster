# Examples to test the classifier

Run from the project folder: `uv run main.py`
Then type a request, then `1` (llm) or `2` (systemone).

## One request per label

| Request | Expected label |
|---|---|
| my function crashes with a KeyError | debug |
| this 200-line function is a mess, split it up | refactor |
| what does this decorator actually do? | explain |
| write a README for this project | document |