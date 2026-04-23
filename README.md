# DSA Master Problem Sheet — Backend

300+ LeetCode problems with **server-side progress persistence** via SQLite.

## What's included

```
dsa-tracker/
├── server.js          # Express API + static file server
├── public/
│   └── index.html     # Full frontend (talks to backend API)
├── data/              # SQLite DB lives here (auto-created)
├── Dockerfile
├── docker-compose.yml
├── deploy.sh
└── package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/progress` | Fetch all solved problems for user |
| `POST` | `/api/progress` | Mark/unmark a problem `{ lcNum, diff, solved }` |
| `GET` | `/api/stats` | Get aggregated stats (easy/medium/hard counts) |
| `DELETE` | `/api/progress` | Reset all progress for user |

User identity is carried via the `x-user-id` header (a UUID stored in the browser's localStorage). No login required — users own their UUID.

---

## Option 1 — Run locally (Node.js)

```bash
npm install
node server.js
# → http://localhost:3000
```

Or with auto-reload during development:
```bash
node --watch server.js
```

---

## Option 2 — Docker (recommended for servers)

```bash
# Build and start
docker compose up --build -d

# Or use the helper script
chmod +x deploy.sh
./deploy.sh

# Tail logs
./deploy.sh logs

# Stop
./deploy.sh stop
```

The SQLite database is stored in a named Docker volume (`dsa_data`) so data survives container restarts and rebuilds.

---

## Option 3 — Deploy to Railway

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set the start command: `node server.js`
4. Add a volume mount at `/app/data` for persistence
5. Railway auto-detects the port from `PORT` env var

---

## Option 4 — Deploy to Render

1. Push to GitHub
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add a Persistent Disk mounted at `/app/data`

---

## Option 5 — Deploy to a VPS (Ubuntu/Debian)

```bash
# Install Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# Clone / copy the project
git clone <your-repo> dsa-tracker
cd dsa-tracker
npm install

# Run with PM2 (keeps it alive)
npm install -g pm2
pm2 start server.js --name dsa-tracker
pm2 save
pm2 startup   # auto-start on reboot
```

Then optionally put Nginx in front:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-User-Id $http_x_user_id;
    }
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port to listen on |
| `NODE_ENV` | `development` | Set to `production` in prod |

---

## How user identity works

- On first visit, the server generates a UUID and sends it back via the `x-user-id` response header
- The frontend stores this UUID in `localStorage` and sends it with every request
- There's no login — your UUID is your identity. Share it across devices to sync progress
- Progress is isolated per UUID in SQLite
