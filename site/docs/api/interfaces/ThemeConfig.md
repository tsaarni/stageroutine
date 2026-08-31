# Interface: ThemeConfig

Theme configuration object for customizing stage canvas, typography, and surface tokens.
Supports camelCase property names (e.g. `surfaceBorder`) or raw CSS variable names (`--sr-surface-border`).

## Indexable

> \[`key`: `string`\]: `string` \| `undefined`

Custom CSS variables or extended theme keys.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="accent"></a> `accent?` | `string` | Accent highlight color (maps to `--sr-accent`). |
| <a id="background"></a> `background?` | `string` | Background color of the stage canvas (maps to `--sr-background`). |
| <a id="primary"></a> `primary?` | `string` | Brand/accent highlight color (maps to `--sr-primary`). |
| <a id="surface"></a> `surface?` | `string` | Surface background fill for cards, terminals, and badges (maps to `--sr-surface`). |
| <a id="surfacebackdrop"></a> `surfaceBackdrop?` | `string` | Backdrop blur filter for translucent surfaces (maps to `--sr-surface-backdrop`). |
| <a id="surfaceborder"></a> `surfaceBorder?` | `string` | Outline border for surface containers (maps to `--sr-surface-border`). |
| <a id="surfacehighlight"></a> `surfaceHighlight?` | `string` | Top specular highlight / rim color for surfaces (maps to `--sr-surface-highlight`). |
| <a id="surfaceshadow"></a> `surfaceShadow?` | `string` | Elevation shadow and inner lighting for surfaces (maps to `--sr-surface-shadow`). |
| <a id="text"></a> `text?` | `string` | Primary text color for headlines and hero typography (maps to `--sr-text`). |
| <a id="textdim"></a> `textDim?` | `string` | Tertiary text color for kickers, labels, and bullet dots (maps to `--sr-text-dim`). |
| <a id="textmuted"></a> `textMuted?` | `string` | Secondary text color for body paragraphs and descriptions (maps to `--sr-text-muted`). |
