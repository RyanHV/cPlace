const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const WIDTH = 100;
const HEIGHT = 100;
let pixels = Array.from({ length: HEIGHT }, () =>
  Array.from({ length: WIDTH }, () => "#FFFFFF")
);

io.on("connection", (socket) => {
  console.log("Novo usuário conectado:", socket.id);

  socket.emit("init", pixels);

  socket.on("paintPixel", ({ x, y, color }) => {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      pixels[y][x] = color;
      io.emit("updatePixel", { x, y, color });
    }
  });
});

server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
