#!/bin/bash
echo "--- Renser systemet og installerer korrekt Node v20 ---"

# 1. Fjern Node v25 og alle rester
apt-get purge -y nodejs
apt-get autoremove -y
rm -rf /usr/local/bin/node /usr/local/bin/npm /etc/apt/sources.list.d/nodesource.list

# 2. Installer de nødvendige værktøjer (bzip2 er vigtig!)
apt-get update
apt-get install -y bzip2 git curl chromium unclutter

# 3. Installer Node.js v20 korrekt
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 4. Udpak Plexamp (nu virker det fordi bzip2 er installeret)
echo "Udpakker Plexamp..."
mkdir -p plexamp-run
tar -xvf Plexamp-Linux-headless-v4.10.1.tar.bz2 -C plexamp-run --strip-components=1

# 5. Opsæt Services
cp plexamp.service /etc/systemd/system/
cat <<EOF > /etc/systemd/system/plexamp-ui.service
[Unit]
Description=Plexamp UI Server
After=network.target

[Service]
WorkingDirectory=/root/plexamp
ExecStart=/usr/bin/node ui-server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable plexamp plexamp-ui

echo "--- Setup færdig! ---"
echo "Kør nu: cd plexamp-run && node js/index.js"
