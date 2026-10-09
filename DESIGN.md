# Design

CUIS has six type roles: page title, section title, card title, metric, body, and label. A page does not add a seventh size.

Density changes space, not type. `data-cuis-density` is `compact`, `standard`, or `comfortable`.

Themes are `core`, `mono`, and `redhat`. `redhat` is inspired by Red Hat and uses the open-source Red Hat fonts. It is not a Red Hat product.

Components read `--cuis-*` tokens. Hex values belong in a theme file.

Hover and pressed states change brightness or elevation, not size. Focus uses `:focus-visible`.

Charts and diagrams keep their own tokens. `packages/bridge/kits.css` maps core tokens onto them. Set `data-theme` from `data-cuis-appearance` when those kits are on the page.
