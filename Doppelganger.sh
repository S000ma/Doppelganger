#!/bin/bash
# Démarrage de unclutter et du bot dans le même environnement X virtuel
sudo -u puppeteer xvfb-run -a -s "-screen 0 1920x1080x24" bash -c "unclutter -idle 0 & /usr/bin/node /var/www/shadow-browsing/server2.js"
