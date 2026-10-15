# Roam iPhone App (free sideloading)

This is a native iOS WKWebView container, not a Safari shortcut or PWA. It opens the current Roam GitHub Pages app in a standalone app window.

## Build without a Mac
1. Open the GitHub repository > Actions > **Roam iOS unsigned IPA** > Run workflow.
2. When the run succeeds, download the **Roam-iOS-unsigned-IPA** artifact and extract its ZIP to obtain `Roam-unsigned.ipa`.
3. On a Windows PC install Sideloadly (official site: https://sideloadly.io/).
4. Connect iPhone to Windows with a cable, trust the computer, select the IPA in Sideloadly, enter your own Apple ID **inside Sideloadly** for signing, and install.
5. On iPhone enable Developer Mode if prompted, and trust the developer certificate if prompted.

Free Apple ID limitations: typically must re-sign/reinstall every 7 days, and device/app count limits apply. Never send your Apple ID/password to this repository or to ChatGPT. This workflow outputs an **unsigned** IPA; it cannot be installed on iPhone until signed.

## Important data caveat
Roam currently stores trip data in browser local storage. The native WKWebView has a **separate storage container** from Safari. Before installing, export/back up trips from Safari using Roam's export feature, then import them in the app. Do not delete Safari data until the import is verified.

The app loads https://15641288268.github.io/Roam-/ and needs internet for the initial page load. This is a native wrapper, not yet a fully offline bundle. Test Google Maps links, image/file picker, AI Worker, PDFs and vouchers on device.
