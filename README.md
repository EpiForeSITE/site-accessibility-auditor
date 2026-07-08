<div align="center">

<img src="src/icons/icon-128.png" alt="Site Accessibility Auditor logo" width="96" height="96" />

# Site Accessibility Auditor

**A Chrome DevTools extension that audits web accessibility across five dimensions — touch targets, keyboard flow, color contrast, data visualizations, and interactive states.**

[![Build](https://img.shields.io/github/actions/workflow/status/rahatzamancse/site-accessibility-auditor/build.yml?branch=main&label=build&logo=githubactions&logoColor=white)](https://github.com/rahatzamancse/site-accessibility-auditor/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/rahatzamancse/site-accessibility-auditor?logo=github&label=release)](https://github.com/rahatzamancse/site-accessibility-auditor/releases/latest)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-4285F4?logo=googlechrome&logoColor=white)](manifest.json)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/rahatzamancse/site-accessibility-auditor/pulls)

<!-- TODO: replace EXTENSION_ID with the real Chrome Web Store ID once published -->

[**Install from Chrome Web Store**](https://l.insane.casa/accessibility-auditor) · [Latest Release](https://github.com/rahatzamancse/site-accessibility-auditor/releases/latest) · [Report a Bug](https://github.com/rahatzamancse/site-accessibility-auditor/issues) · [Privacy Policy](PRIVACY.md)

</div>

---

## Screenshots

<table>
  <tr>
    <td width="33%">
      <img src=".github/screenshots/02.png" alt="Touch target audit showing flagged elements, WCAG rule violations, and iterative fix tracking" />
      <p align="center"><sub><b>Touch Target Auditor</b> — undersized targets flagged on-page with WCAG references and iterative fix tracking</sub></p>
    </td>
    <td width="33%">
      <img src=".github/screenshots/01.png" alt="Reading and focus order panel with tab-order graph, page layout map, and element inspector" />
      <p align="center"><sub><b>Reading &amp; Focus Order</b> — DOM vs. visual vs. accessibility-tree order, with per-element inspection</sub></p>
    </td>
    <td width="33%">
      <img src=".github/screenshots/03.png" alt="Tab order badges overlaid on a live page, with issue counts summarized below" />
      <p align="center"><sub><b>On-page tab-order overlay</b> — order drift, tab breaks, and unreachable controls made visible</sub></p>
    </td>
  </tr>
  <tr>
    <td width="33%">
      <img src=".github/screenshots/05.png" alt="Color audit panel with perceptual simulation options and grouped page colors" />
      <p align="center"><sub><b>Color Audit</b> — semantic color grouping, contrast warnings, and color-vision-deficiency simulation</sub></p>
    </td>
    <td width="33%">
      <img src=".github/screenshots/04.png" alt="Data visualization audit listing detected charts with a detailed WCAG critique" />
      <p align="center"><sub><b>Chart / Data-Viz Audit</b> — SVG and canvas charts analyzed with a WCAG-referenced critique</sub></p>
    </td>
    <td width="33%">
      <img src=".github/screenshots/06.png" alt="Dynamic states panel showing accessibility debt metrics, state matrix, and discovery timeline" />
      <p align="center"><sub><b>Dynamic States</b> — state-dependent accessibility debt, state matrix, and discovery timeline</sub></p>
    </td>
  </tr>
</table>

## Features

| Panel | What it does |
|-------|--------------|
| **Touch Target Auditor** | Flags interactive elements that fall below WCAG minimum target sizes (2.5.8), highlights them on the page, and tracks issues across fix iterations |
| **Reading Order / Keyboard Flow** | Compares DOM, visual, and accessibility-tree order; detects missing accessible names, role mismatches, order drift, tab breaks, and missing tab stops |
| **Color Audit** | AI-assisted contrast analysis that groups page colors into semantic sections and simulates low vision, cataracts, contrast loss, and color-vision deficiencies |
| **Chart / Data-Viz Audit** | Detects SVG and canvas charts, then reviews text alternatives, data fallbacks, contrast, and keyboard access with WCAG-referenced findings |
| **Dynamic States** | Explores hover/focus/active states automatically and quantifies state-dependent accessibility debt with a severity-weighted metric |

## Installation

### From the Chrome Web Store

<!-- TODO: replace EXTENSION_ID with the real Chrome Web Store ID once published -->

Install directly from the [Chrome Web Store](https://l.insane.casa/accessibility-auditor) — no build step required.

### From a GitHub release

1. Download the `site-accessibility-auditor-*.zip` from the [latest release](https://github.com/rahatzamancse/site-accessibility-auditor/releases/latest) and extract it.
2. Open `chrome://extensions` and enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the extracted folder.

### From source

Requires [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 9+ (`npm install -g pnpm`).

```bash
git clone https://github.com/rahatzamancse/site-accessibility-auditor.git
cd site-accessibility-auditor
pnpm install
pnpm build
```

Then load the generated `dist/` folder via **Load unpacked** as described above.

## Usage

1. Open any web page and launch Chrome DevTools (`F12`).
2. Look for the **Accessibility Auditor** tabs in DevTools.
3. Grant the extension access to the inspected page when prompted.
4. Run a scan from any panel — results are highlighted both in the panel and on the page itself.

### AI-assisted analysis (optional)

The Color Audit and Chart Audit panels can use the [OpenAI API](https://platform.openai.com/) for deeper analysis. You'll be prompted for your API key the first time you use them. The key is stored locally in Chrome's extension storage and is only ever sent to `api.openai.com` — see the [privacy policy](PRIVACY.md) for details. Everything else runs entirely on your machine.

## Development

```bash
pnpm dev
```

This builds in watch mode; after each rebuild, click the **reload** icon for the extension on `chrome://extensions` to pick up changes.

| Command | Description |
|---------|-------------|
| `pnpm build` | Production build to `dist/` |
| `pnpm dev` | Build in watch mode |
| `pnpm lint` | Check formatting and types |
| `pnpm format` | Auto-format source files |

### Tech stack

Built with [Svelte 5](https://svelte.dev), [TypeScript](https://www.typescriptlang.org), [Tailwind CSS 4](https://tailwindcss.com), [D3](https://d3js.org), and [Vite](https://vite.dev), packaged as a Manifest V3 DevTools extension.

## Contributing

Contributions are welcome! Please [open an issue](https://github.com/rahatzamancse/site-accessibility-auditor/issues) or submit a pull request.
