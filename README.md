# 🛡️ Blocker Chrome Extension <img src="icons/icon48.png" alt="Blocker Icon" align="right" />

> 🚀 A powerful Chrome extension for blocking and overriding web requests. Monitor, block, and modify web requests in real-time.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/pklddjkiafafofkgjmalldnakfhfpcao.svg?color=blue)](https://chrome.google.com/webstore/detail/pklddjkiafafofkgjmalldnakfhfpcao)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/jeevan-lal/Blocker/pulls)
[![GitHub issues](https://img.shields.io/github/issues/jeevan-lal/Blocker)](https://github.com/jeevan-lal/Blocker/issues)
[![GitHub stars](https://img.shields.io/github/stars/jeevan-lal/Blocker)](https://github.com/jeevan-lal/Blocker/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/jeevan-lal/Blocker)](https://github.com/jeevan-lal/Blocker/network)
[![Languages](https://img.shields.io/badge/Languages-JavaScript%2053.3%25%20%7C%20HTML%2026.8%25%20%7C%20CSS%2019.9%25-blue)](https://github.com/jeevan-lal/Blocker)

</div>

## ✨ Features

### 🚫 Request Blocking
- Block specific URLs using patterns
- Maintain block lists and white lists
- Global JavaScript blocking
- Per-tab JavaScript blocking
- Priority-based blocking rules

### 🔄 Content Override
- Replace content for specific URLs
- Support multiple resource types:
  - 📜 JavaScript
  - 🎨 CSS
  - 🖼️ Images
  - 📝 Fonts
  - 🎬 Media
  - 🔌 WebSocket
  - 📦 Other
- 📤 Upload local files or use remote URLs
- 🎯 Set block locations (Top-Level Pages, 3rd-Party Embeds, Data Requests)
- ⚡ Configure override priorities

### 📊 Request Monitoring
- 🔍 Real-time web request monitoring
- 🏷️ Filter requests by type and status
- 📝 Detailed request information
- 🔎 Search through request logs
- 🗑️ Clear request history

### ⚙️ Settings Management
- 💾 Import/Export settings
- 🔧 Enable/Disable extension
- 🧹 Clear request logs
- 📋 Rule management with priorities
- 🎮 User-friendly interface

## 📥 Installation

### <img src="icons/icon16.png" width="16" height="16"> Chrome Web Store
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/pklddjkiafafofkgjmalldnakfhfpcao.svg?style=for-the-badge&color=blue&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/detail/pklddjkiafafofkgjmalldnakfhfpcao)

> 🚀 Click the badge above to install from the Chrome Web Store.

### 🛠️ Manual Installation
1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## 📖 Usage

### 🔵 Popup Interface

The popup interface provides quick access to:

- 🔘 Enable/Disable extension
- 🚫 Toggle JavaScript blocking (global and per-tab)
- 📊 Start/Stop request monitoring
- 🔍 View and filter request logs
- 🛑 Block/Unblock URLs directly
- 📋 Access detailed request information
- 🔄 Quick reload current tab

### ⚙️ Options Page

The options page allows you to configure:

#### 1. 🎛️ General Settings
- Enable/Disable Blocker
- Block All JavaScript
- Clear Request Logs

#### 2. 🚫 Block List Management
- Add/Remove URLs to block
- View blocked URLs
- Clear block list

#### 3. ✅ White List Management
- Add/Remove URLs to whitelist
- View whitelisted URLs
- Clear white list

#### 4. 🔄 Content Override Settings
- Create content overrides with:
  - 🎯 Target URL patterns
  - 📦 Resource type selection
  - 📤 Content source (file upload or URL)
  - 🌐 Block locations
  - ⚡ Priority settings
- View and manage existing overrides
- Enable/Disable individual overrides

#### 5. 💾 Import/Export
- Export current settings to JSON
- Import settings from JSON file

## 🤝 Contributing

Feel free to submit issues and pull requests for new features or bug fixes. Visit our [GitHub repository](https://github.com/jeevan-lal/Blocker) to:

- [Submit an issue](https://github.com/jeevan-lal/Blocker/issues)
- [Create a pull request](https://github.com/jeevan-lal/Blocker/pulls)
- [Fork the project](https://github.com/jeevan-lal/Blocker/fork)

## 📄 License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/jeevan-lal/Blocker/blob/main/LICENSE)

MIT License - feel free to use this code in your own projects. 