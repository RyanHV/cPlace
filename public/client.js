const socket = io();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const WIDTH = 100;
const HEIGHT = 100;
const SCALE = 8;

canvas.width = WIDTH * SCALE;
canvas.height = HEIGHT * SCALE;

// Cor inicial
let selectedColor = "#FF0000";

// Seleção de cor pelos botões
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedColor = btn.getAttribute("data-color");
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// Desenha todo o quadro
function drawBoard(pixels) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      ctx.fillStyle = pixels[y][x];
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
}

// Ao clicar no canvas, pinta um pixel
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / SCALE);
  const y = Math.floor((e.clientY - rect.top) / SCALE);
  socket.emit("paintPixel", { x, y, color: selectedColor });
});

// Recebe estado inicial
socket.on("init", (pixels) => {
  drawBoard(pixels);
});

// Recebe atualização de pixel
socket.on("updatePixel", ({ x, y, color }) => {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
});
