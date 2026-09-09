# Opening Lab

Opening Lab is an interactive chess opening trainer for learning a repertoire
by playing moves on the board. It includes focused study paths for:

- the Sicilian Defense as Black;
- the Dutch Defense as Black;
- counters to the French Defense as White;
- counters to `1. e4 d5` (the Scandinavian) as White; and
- the Queen's Gambit against `1. d4 d5`.

The full opening catalog is searchable by name or ECO code. Practice progress
and streaks are stored locally in the browser.

## Run locally

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal. Check a production build with
`npm test`.

## Opening database

The bundled database is a snapshot of
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings),
revision `4b8622759e7ae6f93f011cc6c83a3823401ab45e`. It contains 3,810 records from
ECO volumes A–E and is released under CC0 1.0.

The original TSV files and license are in `data/lichess-openings/`. After
updating those files, regenerate the application data:

```bash
npm run data:build
```

## Push to GitHub

This folder is initialized as a Git repository. After creating an empty GitHub
repository, connect and push it:

```bash
git add .
git commit -m "Build Opening Lab chess trainer"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git push -u origin main
```
