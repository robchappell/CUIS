# Contributing to CUIS

Thank you for your interest in contributing. CUIS is an open-source project and contributions of all kinds are welcome.

- Keep type to the six roles already defined. Do not add a seventh size.
- Hover and pressed states change brightness or elevation, not size.
- Put a new theme in `packages/core/themes/` and list it in `packages/core/config.json`.
- Charts and diagrams stay in `packages/viz` and `packages/diag`. They do not read core tokens directly. Map them in `packages/bridge/kits.css`.
- Do not add your personal product data, account systems, or a bundler requirement.

---

## Ways to Contribute

- Add support for agentic use of the static files
- Improve the docs
- Add new components, diagrams, and charts
- Propose new features via GitHub Issues
- Share how you use CUIS
- Fix typos or bugs

---

## Getting Started

### 1. Fork and clone

Fork this repository on GitHub first, then clone **your** fork:

```bash
git clone https://github.com/<your-username>/cuis.git
cd cuis
git remote add upstream https://github.com/robchappell/cuis.git
```

- `origin` = your fork (you push here)
- `upstream` = this project (you fetch updates from here)

### 2. Create a branch

```bash
git checkout -b feat/your-feature-name
```

Branch naming convention:

- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation changes
- `refactor/` — code restructuring
- `workflow/` — examples for using CUIS from an editor or agent

### 3. Make your changes

Follow the existing code style, principles, and patterns. Key guidelines:

- Keep Markdown files clean and well-structured
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
- Open `index.html` in a browser and check the change before submitting

### 4. Commit

```bash
git add .
git commit -m "feat: add a chart specimen to the docs"
```

### 5. Push and create a PR

```bash
git push origin feat/your-feature-name
```

Then open a Pull Request on GitHub.

---

## Code of conduct

Be respectful. Harassment, personal attacks, and exclusionary behavior are not accepted.

The maintainer may remove comments, commits, or contributors who break this standard. Report a problem to Rob Chappell at [robchappell.contact@gmail.com](mailto:robchappell.contact@gmail.com).
