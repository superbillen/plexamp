#!/bin/bash
echo "--- Fuld installation af Plexamp & UI ---"

# 1. Oprydning og Node v20 installation
apt-get remove -y nodejs && apt-get autoremove -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs bzip2 git chromium-browser

# 2. Udpak Plexamp
mkdir -p plexamp-run
tar -xvf Plexamp-Linux-headless-v4.10.1.tar.bz2 -C plexamp-run --strip-components=1

# 3. Opsæt Services (Plexamp + UI Server)
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

echo "Setup færdig! Husk at logge ind i Plexamp før du genstarter."