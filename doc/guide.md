
## Run this in the project directory:

npm run build

This produces the dist/ folder. To load it in Chrome:

1. Open chrome://extensions
2. Enable Developer mode (top-right toggle)
3. Click Load unpacked → select the dist/ folder

During development, use:

npm run dev

The crxjs plugin supports HMR — Chrome will auto-reload the extension as you save files (you may need to reload the popup manually by closing and reopening it).
