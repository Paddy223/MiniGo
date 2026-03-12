# MiniGo

A lightweight browser Go game designed for small boards (default 5x5) with a built-in AI opponent.

## Features

- Play as **Black** against an AI playing **White**.
- Adjustable board size (5 to 13) so you can start tiny and scale later.
- Core Go mechanics:
  - Captures by removing groups with no liberties.
  - Suicide prevention.
  - Simple ko protection (prevents immediate board repetition).
- Pass support and game end after two consecutive passes.

## Run

Just open `index.html` in a browser.

If you prefer serving files locally:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## AI behavior

The AI is intentionally lightweight for browser use. It scans legal moves and scores them using:

- Immediate captures (high priority)
- Group safety (liberty count)
- Board control (center preference)
- Opponent move pressure (fewer legal replies)

This makes it quick and reasonably challenging on small boards.
