# Site Accessibility Auditor

A Chrome DevTools extension for auditing web accessibility across multiple dimensions: touch-target sizing, keyboard navigation flow, color contrast, data-visualization accessibility, and interactive-state coverage.

## Features

- **Touch Target Auditor** – flags interactive elements that are too small for reliable touch interaction
- **Reading Order / Keyboard Flow** – visualizes the DOM focus order to surface keyboard navigation issues
- **Color Audit** – AI-assisted color-contrast analysis powered by the OpenAI API
- **Chart / Data-Viz Audit** – accessibility review of SVG and canvas charts
- **States Panel** – captures and compares hover, focus, and active visual states

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| [Node.js](https://nodejs.org/) | 20 |
| [pnpm](https://pnpm.io/) | 9 |
| Google Chrome (or any Chromium-based browser) | latest |

Install pnpm if you don't have it already:

```bash
npm install -g pnpm
```

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/EpiForeSITE/site-accessibility-auditor.git
cd site-accessibility-auditor

# 2. Install dependencies
pnpm install

# 3. Build the extension
pnpm build
```

The compiled extension will be in the `dist/` directory.

## Loading the Extension in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `dist/` folder produced by the build step above.
5. Open any web page, open Chrome DevTools (`F12`), and look for the **Accessibility Auditor** tab.

## Development

Run the build in watch mode so that the extension is rebuilt automatically on every file change:

```bash
pnpm dev
```

After the first rebuild, click the **reload** icon for the extension on `chrome://extensions` to pick up the latest changes.

### Other useful commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Production build |
| `pnpm dev` | Build in watch mode |
| `pnpm test` | Run the test suite |
| `pnpm lint` | Check formatting and types |
| `pnpm format` | Auto-format source files |

## Using the Color / AI Audit features

The color audit and chart audit panels call the [OpenAI API](https://platform.openai.com/). You will be prompted to enter your API key the first time you use those panels; the key is stored locally in Chrome's extension storage and is never transmitted anywhere other than `api.openai.com`.

## Evaluation

The `evaluation/` directory contains reproducible benchmark fixtures and scripts for comparing the tool's output against a ground-truth dataset. See [`evaluation/README.md`](evaluation/README.md) for details.

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## License

See [LICENSE](LICENSE) for details.
