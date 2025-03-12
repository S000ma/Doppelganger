# Doppelganger
Doppelganger BOT Project
# Doppelganger Project Installation Guide


# Doppelganger - README

## 🔎 About the Project

**Doppelganger** is an innovative offensive security tool designed for advanced penetration testing by creating highly realistic phishing pages. Its operation relies on continuous interaction between an automated bot and a client web page hosted on a VPS server.

### ⚙️ General Operation

- An **automated bot** visits a target web page in real-time, generating a continuous and interactive video stream of what it sees on screen.
- A **phishing web page**, hosted on the same server, displays this video stream in full-screen to the victim. Each click and keystroke made by the user on this page is instantly transmitted to the bot.
- The bot immediately replicates these interactions on the actual target page, giving the victim the impression of interacting directly with the authentic site.

Real-time communication between the bot and the phishing page is managed via **WebRTC** technology, while all interaction handling is executed in **JavaScript**.

### 🎯 Objectives and Use Cases

The Doppelganger project aims to replace traditional tools like EvilProxy, particularly when targeting organizations equipped with highly effective modern protections. By combining realism with maximum discretion, it enables offensive security teams to thoroughly evaluate vulnerabilities in users and systems against sophisticated phishing attacks.

The project is currently functional but remains open to improvements. Contributions from the community to enhance and optimize the tool are warmly welcomed. Feel free to open issues, suggest improvements, or directly participate in development!

### System Requirements

- **Nginx** to serve the client page
- **Coturn** for managing WebRTC video streams
- **Node.js & npm** to run Puppeteer
- **Xvfb** to emulate a graphical environment

### Node.js Dependencies

- WebSocket (`ws`)
- Puppeteer and associated plugins

### Puppeteer Core Patch (Anti-CDP)

See detailed steps below for correctly applying this patch.

## 🚨 Legal Disclaimer

This tool is intended exclusively for legal and ethical use within authorized security testing. Any misuse or illegal activity is solely the user's responsibility.




## 🛠️ Installation

## System Requirements

### 1. Hosting the Client Page with Nginx

Install **Nginx** to serve the client page:

```bash
sudo apt install -y nginx
```

### 2. TURN Server Installation (Coturn)

Install **Coturn** for managing WebRTC video streams. Ensure you use the provided configuration file (usually located at `/etc/turnserver.conf`) and adapt it to your specific needs.

```bash
sudo apt install -y coturn
```

### 3. Node.js & npm Installation

Install **Node.js** and **npm**, required for Puppeteer and related tools:

```bash
sudo apt install -y nodejs npm
```
> **Note:** Make sure the Node.js version is compatible with Puppeteer.

### 3. Xvfb Installation

To emulate a graphical environment required by the bot, install **Xvfb**.

```bash
sudo apt install -y xvfb
```

## Node.js Dependencies Installation

### 1. WebSocket Module (ws)

The `ws` module handles data transmission between the client and the bot.

```bash
npm install ws
```

### 2. Puppeteer and Plugins

Install **Puppeteer** along with its plugins to avoid bot detection and handle keyboard inputs effectively:

```bash
npm install puppeteer puppeteer-extra
npm install puppeteer-extra-plugin-stealth
npm install puppeteer-keyboard
```

> **Note:** If you encounter issues with `puppeteer-keyboard`, consult its GitHub repository for additional instructions.

## Puppeteer Core Patch (Anti-CDP)

To bypass Chrome DevTools Protocol (CDP) detection, apply the following patch:

### Step 1: Downloading the Patch

- Visit the [Puppeteer Core Anti-CDP patch](https://github.com/rebrowser/rebrowser-patches/blob/main/patches/puppeteer-core/).
- Click the **Raw** button to obtain the patch's raw content.
- Copy the patch content into a local file (e.g., `lib.patch`) in your working directory.

### Step 2: Locate Puppeteer Core Module

The patch targets the `puppeteer-core` module, typically found here:

```bash
node_modules/puppeteer-core
```

### Step 3: Apply the Patch

Open a terminal at your project's root directory and execute:

```bash
cd node_modules/puppeteer-core
patch -p1 < /path/to/your/lib.patch
```

- `-p1` tells the patch command to strip the first segment of the path. Adjust if necessary.
- Replace `/path/to/your/lib.patch` with your actual file path.

### Step 3: Verify Patch Application

Open modified files in `node_modules/puppeteer-core` to confirm the patch applied successfully.

### Step 4 (Optional): Automate with patch-package

To automate patch reapplication upon dependency reinstall:

- Install `patch-package` as a dev dependency:

```bash
npm install patch-package --save-dev
```

- Manually apply the patch as described above.
- Generate the patch from your project's root directory:

```bash
npx patch-package puppeteer-core
```

This creates a file in the `patches/` directory (e.g., `patches/puppeteer-core+<version>.patch`).

- Add the following script to your `package.json` to automate the patch application:

```json
"scripts": {
  "postinstall": "patch-package"
}
```


