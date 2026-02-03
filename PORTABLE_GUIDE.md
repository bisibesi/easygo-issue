# 🎒 EasyGo Issue Portable Guide

**EasyGo Issue** is designed to run instantly on computers without any development environment installed.

## 1. Reliable Runtime Environment
This package includes the **Official Node.js Binary (`bin/node.exe`)**.
- It does not require separate download or installation.
- It does not modify your system (no registry changes).
- It is official and secure.

## 2. Deployment (Easy 3-Step)

This process prepares the folder on your development PC for deployment to USB or other devices.

1.  **Build**: Run `npm run build` in your terminal.
2.  **Verify**: Check that the `dist` folder (frontend) and `bin` folder (launcher) exist.
3.  **Copy**: Copy the **entire project folder** to your USB drive or external hard drive. Done!

## 3. How to Run (User)
- **Windows**: Just double-click `start_app.bat` inside the folder.
- **Stop**: Close the black terminal window to safely stop the server.

## 4. Data Backup & Management
All critical data is stored in **one single file**.

- **Data File**: `server/database.sqlite`

To backup, simply copy this file to a safe location. Overwriting this file will restore your previous data.
