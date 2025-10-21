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

// Espaço pressionado = modo de pintura ao passar o mouse
let spaceDown = false;
let lastPaintTime = 0;
const PAINT_THROTTLE = 20; // ms entre paint events
let lastPaintedPixel = { x: -1, y: -1 };

// Seleção de cor pelos botões

// Audio

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

// Ao mover o mouse sobre o canvas, pinta se a barra de espaço estiver pressionada
canvas.addEventListener('mousemove', (e) => {
  if (!spaceDown) return;
  const now = Date.now();
  if (now - lastPaintTime < PAINT_THROTTLE) return; // throttle
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / SCALE);
  const y = Math.floor((e.clientY - rect.top) / SCALE);
  if (x === lastPaintedPixel.x && y === lastPaintedPixel.y) return;
  lastPaintTime = now;
  lastPaintedPixel = { x, y };
  if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
    // enviar para o servidor e desenhar localmente para feedback imediato
    socket.emit('paintPixel', { x, y, color: selectedColor });
    ctx.fillStyle = selectedColor;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
  }
});

// Detecta pressionamento / soltura da barra de espaço
window.addEventListener('keydown', (e) => {
  // ignore se o usuário está digitando em um input/textarea
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.repeat) return;
  if (e.code === 'Space') {
    spaceDown = true;
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spaceDown = false;
    lastPaintedPixel = { x: -1, y: -1 };
  }
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
