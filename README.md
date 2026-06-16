# Ledger — Personal Budget App

Your personal budget, built like a calendar. Track daily expenses, see spending habits, and stay on top of your savings goals.

---

## Getting it running on your computer

### Step 1 — Install Live Server in VS Code

1. Open VS Code
2. Press `Ctrl + Shift + X` to open Extensions
3. Search for **Live Server** (by Ritwick Dey)
4. Click Install

### Step 2 — Open the project

1. Open VS Code
2. Go to **File → Open Folder**
3. Select the `budget-app` folder
4. You should see all the files in the left sidebar

### Step 3 — Start the server

1. In the file sidebar, right-click `index.html`
2. Select **Open with Live Server**
3. Your browser will open automatically at `http://127.0.0.1:5500`
4. The app should load and show the onboarding flow

---

## Getting it on your iPhone

### Step 4 — Find your computer's IP address

1. In VS Code, open the Terminal: `Ctrl + `` ` `` ` (backtick)
2. Type `ipconfig` and press Enter
3. Look for **IPv4 Address** under your active network adapter (usually Wi-Fi)
4. It will look something like `192.168.1.45`

### Step 5 — Connect from your iPhone

> ⚠️ Your iPhone and computer must be on the **same Wi-Fi network**

1. On your iPhone, open **Safari** (must be Safari, not Chrome)
2. In the address bar, type: `http://[YOUR-IP]:5500`
   - Example: `http://192.168.1.45:5500`
3. The app should load on your phone

### Step 6 — Install it to your home screen

1. Tap the **Share button** (box with arrow pointing up) at the bottom of Safari
2. Scroll down and tap **Add to Home Screen**
3. Name it **Ledger**
4. Tap **Add**

### Step 7 — Open it like an app

1. Go to your iPhone home screen
2. Tap the **Ledger** icon
3. It opens fullscreen like a native app — no Safari bar

> 💡 **Important:** Keep Live Server running on your computer whenever you use the app. The app works offline once loaded (service worker caches everything), but the initial load needs your computer to be running.

---

## Making it fully offline (optional)

Once you've loaded the app at least once on your iPhone with Live Server running, the service worker will cache all files. After that:

- You can open it from your home screen even without your computer nearby
- All your data is stored on your iPhone in localStorage
- No internet connection needed

---

## Giving someone else a blank copy

To share a clean version of Ledger with no personal data:

1. Copy the entire `budget-app` folder
2. That's it — share the folder. The new user goes through fresh onboarding when they first open it
3. Their data stays on their own device, completely separate from yours

---

## File structure

```
budget-app/
  index.html          ← App shell & PWA setup
  manifest.json       ← Makes it installable on iPhone
  sw.js               ← Service worker (offline support)
  css/
    theme.css         ← Paper & Ink design system + dark mode
  js/
    data.js           ← All localStorage operations
    insights.js       ← Habit tracking engine
    onboarding.js     ← Step-by-step setup flow
    app.js            ← All screens, navigation, logic
  icons/
    icon-192.png      ← App icon (home screen)
    icon-512.png      ← App icon (large)
  README.md           ← This file
```

---

## Troubleshooting

**App won't load on iPhone**
- Make sure both devices are on the same Wi-Fi network
- Double-check the IP address with `ipconfig`
- Make sure Live Server is running (check VS Code status bar at the bottom — it should say "Port: 5500")

**Changes I made in VS Code aren't showing on iPhone**
- Live Server auto-refreshes, but iPhone Safari may cache aggressively
- Pull down to refresh on the iPhone browser
- Or close and reopen the Safari tab

**The app icon looks wrong**
- iPhone caches the icon. Delete the app from your home screen and re-add it

**Dark mode not working**
- Go to Settings in the app and toggle dark mode manually
- Or it will follow what you set during onboarding

---

## Updating the app

When you make code changes:
1. Save in VS Code
2. Live Server auto-reloads
3. On iPhone, close the app fully (swipe up and close it) then reopen
4. Hard refresh if needed: tap the address bar in Safari and reload

---

*Built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies, no build step.*
