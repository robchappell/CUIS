# Contributing

Issues and pull requests are welcome.

- Keep type to the six roles already defined. Do not add a seventh size.
- Hover and pressed states change brightness or elevation, not size.
- Put a new theme in `packages/core/themes/` and list it in `packages/core/config.json`.
- Charts and diagrams stay in `packages/viz` and `packages/diag`. They do not read core tokens directly. Map them in `packages/bridge/kits.css`.
- Do not add product data, account systems, or a bundler requirement.
