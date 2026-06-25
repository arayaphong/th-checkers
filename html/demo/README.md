# HTML UI Demo Positions

These JSON files are sample initial positions for the HTML UI file loader. Each file follows the position-file schema:

```json
{
  "version": 1,
  "pieces": {
    "A1": { "color": "white" | "black", "type": "pion" | "dame" },
    "..."
  }
}
```

They mirror the demo scenarios used by the command-line REPL in `src/app/`.

## Files

- **`demo1.json`** — Branching chain capture with the same final landing.  
  White pion on D5 can capture via two paths that both end on D1.

- **`demo2.json`** — Dame loop capture ending on the original square.  
  White dame on D5 circles four black pions and lands back on D5.

- **`demo31.json`** — Dame loop capture with two mirror-image paths.  
  White dame on D1 surrounded by six black pions; both loop directions capture the same pieces.

- **`demo32.json`** — Dame loop capture with extra central branching.  
  Same ring as `demo31.json` plus a black pion on E4, creating genuine capture branches.

## Usage

In the HTML UI, click the load-state button (📂) and select one of these files. The current game and history will be reset, and a new game will start from the loaded position.
