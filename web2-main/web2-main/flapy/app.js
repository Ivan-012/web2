// === Referencias al DOM ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startScreen = document.querySelector(".startScreen");
const nameInput = document.getElementById("nameInput");
const startButton = document.getElementById("startButton");

const MAX_NAME_LENGTH = 12;
let playerName = "";
let state = "name"; 
let frames = 0;
let score = 0;
let pipes = [];


const DEGREE = Math.PI / 180;


const bgImage = new Image();
bgImage.src = "paisaje cielo.jpg"; 
const birdImg = new Image();
birdImg.src = "labubu.png";
const pipeTopImg = new Image();
pipeTopImg.src = "tubo_top.png";
const pipeBottomImg = new Image();
pipeBottomImg.src = "tubo_bot.png";
const pipeWidth = 55;
const gap = 120; //espaciado



// pajaro
const bird = {
  x: 50,
  y: 150,
  w: 40, //ancho
  h: 40, //alto
  gravity: 0.25,
  jump: 4.6,
  speed: 0,
  rotation: 0,

  draw() {
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.rotate(this.rotation);

  ctx.drawImage(
    birdImg,
    -this.w / 2,
    -this.h / 2,
    this.w,
    this.h
  );

  ctx.restore();
},


  update() {
    this.speed += this.gravity;
    this.y += this.speed;

    if (this.y + this.h / 2 >= canvas.height) {
      endGame();
    }

    this.rotation = this.speed >= this.jump ? 90 * DEGREE : -25 * DEGREE;
  },

  flap() {
    this.speed = -this.jump;
  },

  reset() {
    this.y = 150;
    this.speed = 0;
    this.rotation = 0;
  },
};

// tubos
function drawPipes() {
  pipes.forEach((pipe) => {
    ctx.drawImage(pipeTopImg, pipe.x, 0, pipeWidth, pipe.top);

    ctx.drawImage(
      pipeBottomImg,
      pipe.x,
      canvas.height - pipe.bottom,
      pipeWidth,
      pipe.bottom
    );
  });
}

function updatePipes() {
  if (frames % 100 === 0) {
    let top = Math.floor(Math.random() * (canvas.height - gap - 100)) + 50;
    let bottom = canvas.height - top - gap;
    pipes.push({ x: canvas.width, top, bottom });
  }

  pipes.forEach((pipe, i) => {
    pipe.x -= 2;

    //Colisión
    if (
      bird.x + bird.w / 2 > pipe.x &&
      bird.x - bird.w / 2 < pipe.x + pipeWidth &&
      (bird.y - bird.h / 2 < pipe.top ||
        bird.y + bird.h / 2 > canvas.height - pipe.bottom)
    ) {
      endGame();
    }

    //Sumar puntos
    if (pipe.x + pipeWidth < 0) {
      pipes.splice(i, 1);
      score++;
      playSound(pointSound);
    }
  });
}

//Puntajes 
function getScores() {
  const raw = JSON.parse(localStorage.getItem("scores")) || [];
  return raw.map((s) =>
    typeof s === "number" ? { name: "Jugador", score: s } : s
  );
}

function saveScore(name, points) {
  let scores = getScores();
  scores.push({ name, score: points });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 5);
  localStorage.setItem("scores", JSON.stringify(scores));
}


function drawScoreTable() {
  const scores = getScores();
  ctx.textAlign = "center";
  ctx.fillStyle = "black";
  ctx.font = "18px 'Poppins', sans-serif";
  ctx.fillText("🏆 Mejores Puntuaciones 🏆", canvas.width / 2, canvas.height / 2 + 120);
  scores.forEach((s, i) => {
    ctx.fillText(`${i + 1}. ${s.name} - ${s.score}`, canvas.width / 2, canvas.height / 2 + 150 + i * 25);
  });
}

// Pantallas 
function drawIntroScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "black";
  ctx.font = "42px 'Poppins', sans-serif";
  ctx.fillText("Flappy Bird", canvas.width / 2, 200);

  ctx.font = "20px 'Poppins', sans-serif";
  ctx.fillText("Controles:", canvas.width / 2, 270);
  ctx.fillText("Espacio o Click = Volar", canvas.width / 2, 300);
  ctx.fillText("S = Activar/Desactivar Sonidos", canvas.width / 2, 330);

  ctx.fillStyle = "blue";
  ctx.font = "16px 'Poppins', sans-serif";
  ctx.fillText("Click o Espacio para comenzar", canvas.width / 2, 380);

  drawScoreTable();
}

function drawGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "red";
  ctx.font = "40px 'Poppins', sans-serif";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 30);

  ctx.fillStyle = "black";
  ctx.font = "20px 'Poppins', sans-serif";
  ctx.fillText("Puntaje: " + score, canvas.width / 2, canvas.height / 2 + 20);

  ctx.fillStyle = "blue";
  ctx.font = "16px 'Poppins', sans-serif";
  ctx.fillText("Click o Espacio para volver al menú", canvas.width / 2, canvas.height / 2 + 60);

  drawScoreTable();
}

// audio
const flapSound = new Audio("flap.mp3");
const gameOverSound = new Audio("die.mp3");
const pointSound = new Audio("point.mp3");

flapSound.volume = 0.7;
gameOverSound.volume = 0.8;
pointSound.volume = 0.8;

let soundEnabled = true;
function playSound(effect) {
  if (!soundEnabled) return;
  effect.currentTime = 0;
  effect.play();
}
function drawSoundStatus() {
  ctx.fillStyle = "gray";
  ctx.font = "14px 'Poppins', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(` Sonidos: ${soundEnabled ? "ON" : "OFF"}`, 10, 20);
}

// Juego 
function resetGame() {
  score = 0;
  pipes = [];
  bird.reset();
  frames = 0;
  state = "play";
}

function endGame() {
  state = "over";
  saveScore(playerName, score);
  playSound(gameOverSound);
}

//Iniciar 
startButton.addEventListener("click", () => {
  let input = nameInput.value.trim();
  if (!input) {
    alert("Debes ingresar un nombre para jugar.");
    return;
  }
  if (input.length > MAX_NAME_LENGTH) input = input.slice(0, MAX_NAME_LENGTH);
  playerName = input;
  startScreen.style.display = "none";
  state = "start"; 
});

// controles
function handleInput() {
  if (state === "start") {
    resetGame();
  } else if (state === "play") {
    bird.flap();
    playSound(flapSound);
  } else if (state === "over") {
    startScreen.style.display = "flex";
    nameInput.value = "";
    state = "name";
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") handleInput();
  if (e.code === "KeyS") soundEnabled = !soundEnabled;
});
canvas.addEventListener("click", handleInput);

// bucle
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state === "name") {
  } else if (state === "start") {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    drawIntroScreen();
  } else if (state === "play") {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    bird.update();
    bird.draw();
    updatePipes();
    drawPipes();
    ctx.fillStyle = "#fff";
    ctx.font = "30px 'Poppins', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(score, canvas.width / 2, 50);
    frames++;
  } else if (state === "over") {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    drawGameOver();
  }
  drawSoundStatus();
  requestAnimationFrame(loop);
}

loop();
