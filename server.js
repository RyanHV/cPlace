const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// Se o app estiver atrás de um proxy (nginx, Cloudflare), habilite:
// permite que express/Socket.IO confiem em X-Forwarded-For
app.set("trust proxy", true);

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const WIDTH = 100;
const HEIGHT = 100;
const fs = require('fs');
const path = require('path');

const pixelsFile = path.join(__dirname, 'pixels.json');

let pixels = Array.from({ length: HEIGHT }, () =>
  Array.from({ length: WIDTH }, () => "#FFFFFF")
);

// Try to load existing pixels.json on startup
try {
  if (fs.existsSync(pixelsFile)) {
    const raw = fs.readFileSync(pixelsFile, 'utf8');
    const parsed = JSON.parse(raw);
    // basic validation
    if (Array.isArray(parsed) && parsed.length === HEIGHT) {
      pixels = parsed;
      console.log('Loaded pixels from', pixelsFile);
    }
  }
} catch (err) {
  console.error('Failed to load pixels.json:', err.message);
}

// Auto-save with debounce to avoid excessive writes
let saveTimeout = null;
function scheduleSave(delay = 1000) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(pixelsFile, JSON.stringify(pixels));
      // console.log('Pixels saved to', pixelsFile);
    } catch (err) {
      console.error('Failed to save pixels:', err.message);
    }
    saveTimeout = null;
  }, delay);
}

// Ensure we flush on exit
function flushAndExit() {
  try {
    fs.writeFileSync(pixelsFile, JSON.stringify(pixels));
    console.log('Pixels flushed to', pixelsFile);
  } catch (err) {
    console.error('Failed to flush pixels on exit:', err.message);
  }
  process.exit();
}
process.on('SIGINT', flushAndExit);
process.on('SIGTERM', flushAndExit);

io.on("connection", (socket) => {
  // 1) IP direto via handshake (funciona na maioria dos casos)
  const ipFromHandshake = socket.handshake.address;

  // 2) Checar cabeçalho X-Forwarded-For (caso haja proxy)
  // pode conter uma lista: "client, proxy1, proxy2"
  const xff = socket.handshake.headers["x-forwarded-for"];
  const ipFromXff = xff ? xff.split(",")[0].trim() : null;

  // Escolhe prioridade: XFF (proxy-aware) > handshake.address
  const clientIp = ipFromXff || ipFromHandshake;

  console.log("Novo usuário conectado:", socket.id, "IP:", clientIp);

  // (opcional) guardar em memória / BD
  // connectedClients[socket.id] = { ip: clientIp, connectedAt: Date.now() }

  socket.emit("init", pixels);

  socket.on("paintPixel", ({ x, y, color }) => {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      pixels[y][x] = color;
      io.emit("updatePixel", { x, y, color });
      // schedule save to disk
      scheduleSave();
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Desconectou:", socket.id, "IP:", clientIp, "motivo:", reason);
    // (opcional) delete connectedClients[socket.id]
  });
});

const PORT = 5500;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});