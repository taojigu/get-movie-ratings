# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server with HMR for development
npm run build    # TypeScript compile + Vite production build (outputs to /dist)
npm run lint     # Run ESLint
npm run preview  # Preview the production build locally
```

There are no automated tests. Manual testing requires loading the `/dist` folder as an unpacked Chrome extension via `chrome://extensions`.

## Architecture

This is a **Chrome Extension (Manifest V3)** built with React + TypeScript + Vite, using the `@crxjs/vite-plugin` to bundle everything as a Chrome extension.

### Extension Components

**Popup UI** (`src/main.tsx` → `src/App.tsx`)  
The main React app rendered in the extension popup (480px wide). Has two views: a movie list view and a Douban search iframe view. On mount, it uses `chrome.scripting.executeScript` to inject `scrapeMovies()` into the active tab and collect results.

**Content Script** (`src/content.ts`)  
Injected into IMDb, Douban, and Rotten Tomatoes pages. Minimal — primarily sends the page title to the background worker.

**Background Service Worker** (`src/background.ts`)  
Minimal service worker. Handles `GET_RATINGS` messages and extension lifecycle events.

### Key Constraint: `scrapeMovies()` Must Be Self-Contained

The `scrapeMovies` function in `App.tsx` is executed in the context of the active tab via `chrome.scripting.executeScript`. It **cannot reference any imports, closures, or variables from the surrounding module scope**. Everything it needs must be defined inside the function body itself.

### Movie Scraping Logic

`scrapeMovies()` uses three fallback strategies to find movies on any page:
1. Elements with `img.poster[alt]` or `img[class*="poster"][alt]`
2. `<a title>` anchors wrapping images
3. `<li>` elements containing both images and title-like elements

Results are deduplicated by title, capped at 120 movies. Local `file://` images are converted to base64 data URLs (max 120KB) so they survive the popup context; remote images are used as-is.

### Search Integration

Movie titles are used to build Douban search URLs, which open in an iframe inside the popup.

## Extension Manifest

- **Permissions**: `storage`, `activeTab`, `scripting`, `tabs`
- **Host permissions**: `*://*/*` (all URLs)
- **Content scripts**: injected on `*://*.imdb.com/*`, `*://*.douban.com/*`, `*://*.rottentomatoes.com/*`

## TypeScript Config

Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`. Target: ES2023. App code uses `tsconfig.app.json`; Vite config uses `tsconfig.node.json`.


## URL recognization 
The extension only works in specified web pages: ["https://www.yfsp.tv/*",
"https://yfsp.tv/*",
"https://www.iyf.tv/*",
"https://iyf.tv/*"]

if current page is not the target url, present a error notifying view, display that this extension only works in the url above