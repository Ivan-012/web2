// === Referencias a elementos del DOM ===
const startScreen = document.querySelector(".startScreen");
const nameInput = document.getElementById("nameInput");
const startButton = document.getElementById("startButton");
const gameContainer = document.querySelector(".game-container");
const gameOverScreen = document.querySelector(".gameOver");
const restartButton = document.getElementById("restartButton");
const finalScoreSpan = document.getElementById("finalScore");

const MAX_NAME_LENGTH = 12;
let playerName = null;
let game = null; // control del intervalo principal

// === CANVAS Y VARIABLES DEL JUEGO ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const box = 20;
let snake = [{ x: 9 * box, y: 10 * box }];
let direction = null;
let food = { x: 0, y: 0 };
let score = 0;

// === FUNCIONES DE JUEGO ===
function resetState() {
  snake = [{ x: 9 * box, y: 10 * box }];
  direction = null;
  food = {
    x: Math.floor(Math.random() * (canvas.width / box)) * box,
    y: Math.floor(Math.random() * (canvas.height / box)) * box,
  };
  score = 0;
}

function drawGrid() {
  const cols = canvas.width / box;
  const rows = canvas.height / box;
  const colorA = "#555";
  const colorB = "#444";

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x * box, y * box, box, box);
    }
  }
}

function collision(head, array) {
  return array.some((part) => part.x === head.x && part.y === head.y);
}

// === TABLA DE PUNTAJES ===
function updateScoreTable() {
  const table = document.getElementById("scoreTable");
  table.innerHTML = "<tr><th>Nombre</th><th>Puntaje</th></tr>";

  const scores = JSON.parse(localStorage.getItem("scores")) || [];
  scores.sort((a, b) => b.score - a.score);

  scores.forEach((entry) => {
    const row = table.insertRow();
    row.insertCell(0).textContent = entry.name;
    row.insertCell(1).textContent = entry.score;
  });
}

// === DIBUJAR EL JUEGO ===
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // dibujar comida
  ctx.fillStyle = "#E53935";
  ctx.fillRect(food.x, food.y, box, box);

  // dibujar serpiente
  for (let i = 0; i < snake.length; i++) {
    ctx.fillStyle = i === 0 ? "#4CAF50" : "#388E3C";
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
  }

  let snakeX = snake[0].x;
  let snakeY = snake[0].y;

  if (direction === "LEFT") snakeX -= box;
  if (direction === "UP") snakeY -= box;
  if (direction === "RIGHT") snakeX += box;
  if (direction === "DOWN") snakeY += box;

  // comer
  if (snakeX === food.x && snakeY === food.y) {
    score++;
    food = {
      x: Math.floor(Math.random() * (canvas.width / box)) * box,
      y: Math.floor(Math.random() * (canvas.height / box)) * box,
    };
  } else {
    snake.pop();
  }

  const newHead = { x: snakeX, y: snakeY };

  // colisiones
  if (
    snakeX < 0 ||
    snakeY < 0 ||
    snakeX >= canvas.width ||
    snakeY >= canvas.height ||
    collision(newHead, snake)
  ) {
    clearInterval(game);
    endGame();
    return;
  }

  snake.unshift(newHead);

  // mostrar puntaje
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 10, 20);
}

// === EVENTOS DE TECLAS ===
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
  else if (event.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
  else if (event.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
  else if (event.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
});

// === INICIO DE JUEGO ===
function startGame() {
  resetState();
  updateScoreTable();
  clearInterval(game);
  game = setInterval(drawGame, 100);
}

// === FINAL DE JUEGO ===
function endGame() {
  const scores = JSON.parse(localStorage.getItem("scores")) || [];
  scores.push({ name: playerName, score: score });
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > 10) scores.length = 10;
  localStorage.setItem("scores", JSON.stringify(scores));

  updateScoreTable();
  finalScoreSpan.textContent = score;
  gameOverScreen.style.display = "block";
}

// === PANTALLA DE NOMBRE ===
startButton.addEventListener("click", () => {
  let input = nameInput.value.trim();

  if (input.length === 0) {
    alert("Debes ingresar un nombre para jugar.");
    return;
  }

  if (input.length > MAX_NAME_LENGTH) {
    const truncated = input.slice(0, MAX_NAME_LENGTH);
    const useTruncated = confirm(`El nombre es muy largo. ¿Usar "${truncated}"?`);
    if (useTruncated) input = truncated;
    else return;
  }

  playerName = input;
  startScreen.style.display = "none";
  gameContainer.style.display = "flex";
  startGame();
});

// === REINICIAR DESDE GAME OVER ===
restartButton.addEventListener("click", () => {
  gameOverScreen.style.display = "none";
  startScreen.style.display = "flex";
});
