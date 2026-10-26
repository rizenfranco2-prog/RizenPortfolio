# Activity File Manager

A responsive HTML/CSS/JavaScript file-manager interface with search, sorting, filters, list/grid views, favorites, trash/restore, activity history, and a responsive layout.

## Project files
- `index.html` — page structure
- `styles.css` — responsive UI styling
- `app.js` — UI behavior and demo metadata persistence

## Run locally
1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. Click **Upload files** to select files and test the interface.

## Important: online storage status
This delivered version is a **front-end demo**, not a cloud-storage service. It stores file names, sizes, favorites, and activity metadata in the current browser's `localStorage`; it does **not** upload original file bytes. It will not sync files across devices. The download action downloads a demo information note, not the original file.

To make it genuinely online and multi-device, connect a cloud backend such as Firebase (Authentication + Cloud Firestore + Cloud Storage) or Supabase (Auth + database + object storage). That requires creating a cloud project, adding its project configuration, setting secure access rules, and hosting the site over HTTPS. Do not publish cloud admin/service-account keys in browser code. Use provider client configuration only, and enforce authorization with backend security rules.

## Recommended Firebase setup for a production-ready next step
1. Create a Firebase project at https://console.firebase.google.com/.
2. Register a Web App and copy its Firebase web configuration.
3. Enable Email/Password sign-in in Authentication.
4. Create a Cloud Firestore database and enable Cloud Storage.
5. Deploy the site to Firebase Hosting (or another HTTPS host).
6. Implement authenticated upload/download/delete operations using Cloud Storage, file metadata in Firestore, and per-user security rules before storing real/private files.

## Privacy
Do not use this demo for sensitive or important files. Browser storage may be cleared by the user or browser. This project contains no server, authentication, cloud upload, or backup.
