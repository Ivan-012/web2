
// Obtenemos el elemento <canvas>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// (bloques del mapa)
const TILE = 40;  
const ROWS = Math.floor(canvas.height / TILE);  
const COLS = Math.floor(canvas.width / TILE);   
let map = [];


function generateMap() {
  // Genera una matriz de tamaño ROWS x COLS
  // Los valores 1 representan muros, 0 espacio vacío
  map = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      // bordes del mapa (paredes fijas)
      if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) return 1;
      // algunos muros internos aleatorios
      if ((r % 3 === 0 && c % 2 === 0) || Math.random() < 0.06) return 1;
      return 0; // espacio libre
    })
  );

  // Función auxiliar para limpiar (poner 0) una celda del mapa
  const clear = (r, c) => {
    if (r >= 0 && c >= 0 && r < ROWS && c < COLS) map[r][c] = 0;
  };

  // zonas seguras
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) clear(r, c);
  for (let r = ROWS - 3; r < ROWS; r++) for (let c = COLS - 3; c < COLS; c++) clear(r, c);

  // limpiar el centro del mapa
  const midR = Math.floor(ROWS / 2), midC = Math.floor(COLS / 2);
  for (let r = midR - 2; r <= midR + 2; r++)
    for (let c = midC - 2; c <= midC + 2; c++) clear(r, c);
}
generateMap(); // generamos el mapa al iniciar


// mantiene un valor dentro de un rango
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }




class Tank {
  constructor(x, y, color, controls, isBot = false) {
    // posición y tamaño
    this.x = x; this.y = y;
    this.spawnX = x; this.spawnY = y; // posición de respawn
    this.w = 28; this.h = 28;
    // dirección y movimiento
    this.angle = 0;
    this.speed = 1.8;
    // color y tipo
    this.color = color;
    this.controls = controls;
    this.isBot = isBot;
    // disparo
    this.reload = 0; // tiempo de recarga
    // estado del tanque
    this.alive = true;
    this.kills = 0; // contador de muertes
    this.vx = 0; this.vy = 0;
    this.thinkTimer = 0; // temporizador de decisiones del bot
  }


  center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.alive = true;
  }

  // Actualiza la lógica del tanque
  update(dt, keys) {
    if (!this.alive) return; // si está muerto, no hace nada
    if (this.isBot) this.runBot(); // lógica del bot
    else this.runPlayer(keys);     // lógica del jugador
    if (this.reload > 0) this.reload--; // contador de recarga
  }

  runPlayer(keys) {
    let vx = 0, vy = 0;
    // Movimiento según teclas
    if (keys[this.controls.up]) vy -= 1;
    if (keys[this.controls.down]) vy += 1;
    if (keys[this.controls.left]) vx -= 1;
    if (keys[this.controls.right]) vx += 1;

    // Si se mueve, se normaliza el vector y se actualiza el ángulo
    if (vx || vy) {
      const mag = Math.hypot(vx, vy);
      vx /= mag; vy /= mag;
      this.angle = Math.atan2(vy, vx);
      this.tryMove(vx * this.speed, vy * this.speed);
    }

    // Disparo (si la recarga terminó)
    if (keys[this.controls.fire] && this.reload <= 0) {
      shootBullet(this);
      this.reload = 25; // tiempo entre disparos
    }
  }

  // === Inteligencia artificial del bot ===
  runBot() {
    // El bot piensa cada cierto tiempo
    if (Date.now() > this.thinkTimer) {
      this.thinkTimer = Date.now() + 400 + Math.random() * 600;

      // Si el jugador está vivo, el bot lo sigue o huye
      if (player1 && player1.alive) {
        const dx = player1.center().x - this.center().x;
        const dy = player1.center().y - this.center().y;
        const dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);
        const dir = dist < 200 ? -1 : 1; // si está cerca, se aleja
        this.vx = Math.cos(this.angle) * dir;
        this.vy = Math.sin(this.angle) * dir;

        // Probabilidad de disparar
        if (dist < 450 && Math.random() < 0.6 && this.reload <= 0) {
          shootBullet(this);
          this.reload = 35;
        }
      } else {
        // Si no hay jugador, se mueve aleatoriamente
        const ang = Math.random() * Math.PI * 2;
        this.vx = Math.cos(ang);
        this.vy = Math.sin(ang);
      }
    }

    // Intentar moverse, si choca, cambia de dirección
    if (!this.tryMove(this.vx * this.speed * 0.7, this.vy * this.speed * 0.7)) {
      const ang = Math.random() * Math.PI * 2;
      this.vx = Math.cos(ang);
      this.vy = Math.sin(ang);
      this.angle = ang;
    }
  }

  // Verifica si el tanque puede moverse sin chocar con muros
  tryMove(dx, dy) {
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (!isRectColliding(nx, ny, this.w, this.h)) {
      this.x = nx; this.y = ny;
      return true;
    }
    return false;
  }

  // Dibuja el tanque en el canvas
  draw() {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-14, -10, 28, 20); // cuerpo
    ctx.fillStyle = "#222";
    ctx.fillRect(6, -3, 18, 6); // cañón
    ctx.restore();
  }
}

// ===========================================================
// CLASE: Bullet (bala disparada por los tanques)
// ===========================================================
class Bullet {
  constructor(x, y, angle, owner) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * 6;
    this.vy = Math.sin(angle) * 6;
    this.r = 5; // radio de la bala
    this.owner = owner; // tanque que disparó
    this.life = 200; // duración antes de desaparecer
    this.alive = true;
  }

  // Actualiza la posición y vida de la bala
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0 || isPointWall(this.x, this.y)) this.alive = false;
  }

  // Dibuja la bala
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd166";
    ctx.fill();
  }
}

// ===========================================================
// FUNCIONES DE COLISIÓN
// ===========================================================

// Verifica si un punto toca un muro
function isPointWall(px, py) {
  const c = Math.floor(px / TILE);
  const r = Math.floor(py / TILE);
  return map[r] && map[r][c] === 1;
}

// Verifica si un rectángulo choca con algún muro
function isRectColliding(x, y, w, h) {
  for (let r = Math.floor(y / TILE); r <= Math.floor((y + h) / TILE); r++) {
    for (let c = Math.floor(x / TILE); c <= Math.floor((x + w) / TILE); c++) {
      if (map[r] && map[r][c] === 1) return true;
    }
  }
  return false;
}

// ===========================================================
// OVERLAY (mensajes temporales en pantalla)
// ===========================================================
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlayText');
let overlayTimer;

function showOverlayText(text, ms = 4000) {
  clearTimeout(overlayTimer);
  overlay.hidden = false;
  overlay.style.display = "flex";
  overlayText.textContent = text;
  overlayTimer = setTimeout(() => {
    overlay.style.display = "none";
    overlay.hidden = true;
  }, ms);
}

// ===========================================================
// VARIABLES GLOBALES DEL JUEGO
// ===========================================================
let player1, player2;
let mode = "1p"; // modo por defecto: 1 jugador (vs bot)
let bullets = [];
const keys = {}; // registro de teclas presionadas

// ===========================================================
// EVENTOS DE TECLAD
// ===========================================================
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// Tecla N → reiniciar juego y kills/ CORRECCIOOON
window.addEventListener("keydown", e => {
  if (e.code === "KeyN") {
    generateMap();
    player1.kills = 0;
    player2.kills = 0;
    player1.respawn();
    player2.respawn();
    showOverlayText("Juego reiniciado");
  }
});

// ===========================================================
// FUNCIÓN: disparar una bala
// ===========================================================
function shootBullet(t) {
  const c = t.center();
  bullets.push(new Bullet(c.x + Math.cos(t.angle) * 20, c.y + Math.sin(t.angle) * 20, t.angle, t));
}

// ===========================================================
// FUNCIÓN: crear jugadores según modo
// ===========================================================
function spawnPlayers(m) {
  bullets = [];
  if (m === "2p") {
    // modo 2 jugadores
    player1 = new Tank(TILE + 5, TILE + 5, "#58b3ff",
      { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", fire: "Space" });
    player2 = new Tank(canvas.width - TILE - 30, canvas.height - TILE - 30, "#ff6b6b",
      { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", fire: "Enter" });
  } else {
    // modo 1 jugador (con bot)
    player1 = new Tank(TILE + 5, TILE + 5, "#58b3ff",
      { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", fire: "Space" });
    player2 = new Tank(canvas.width - TILE - 30, canvas.height - TILE - 30, "#a17cff", {}, true);
  }
}

// ===========================================================
// FUNCIÓN: detección de impactos y reinicio de ronda
// ===========================================================
function checkHits() {
  for (const b of bullets) {
    if (!b.alive) continue;
    for (const t of [player1, player2]) {
      if (!t.alive || t === b.owner) continue;

      // verificación de colisión bala-tanque
      const cx = clamp(b.x, t.x, t.x + t.w);
      const cy = clamp(b.y, t.y, t.y + t.h);
      const dx = b.x - cx, dy = b.y - cy;

      if (dx * dx + dy * dy < b.r * b.r) {
        // impacto detectado
        b.alive = false;
        t.alive = false;
        b.owner.kills++; // suma una kill al tanque que disparó
       
       //CORRECCIIOONNNN
        showOverlayText(`${b.owner === player1 ? "Jugador 1" : (mode === "1p" ? "Bot" : "Jugador 2")} eliminó al rival!`);

        // después de un segundo, se reinicia la ronda
        setTimeout(() => {
          generateMap();
          player1.respawn();
          player2.respawn();
        }, 800);
      }
    }
  }
}

// BUCLE PRINCIPAL DEL JUEGO
function update() {
  if (player1) player1.update(1, keys);
  if (player2) player2.update(1, keys);
  for (const b of bullets) b.update();
  bullets = bullets.filter(b => b.alive);
  checkHits();
}

// Dibuja el mapa, tanques, balas y HUD
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // dibujar el mapa
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c]) {
        ctx.fillStyle = "#2b2f3a";
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  // dibujar balas y tanques
  for (const b of bullets) b.draw();
  if (player1) player1.draw();
  if (player2) player2.draw();

  // CORRECCIONNNNNNNN
ctx.fillStyle = player1.color;
ctx.fillText(`Jugador 1 Kills: ${player1.kills}`, 10, 20);
ctx.fillStyle = player2.color;
ctx.fillText(`${mode === "1p" ? "Bot" : "Jugador 2"} Kills: ${player2.kills}`, 10, 40);

}

// Llamada recursiva para mantener el juego en marcha
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ===========================================================
// BOTONES DE INTERFAZ (para elegir modo o reiniciar)/CORRECCION
// ===========================================================
document.getElementById("mode-1p").addEventListener("click", () => {
  mode = "1p";
  generateMap();
  spawnPlayers(mode);
  showOverlayText("Modo: 1 Jugador (Bot)");
});

document.getElementById("mode-2p").addEventListener("click", () => {
  mode = "2p";
  generateMap();
  spawnPlayers(mode);
  showOverlayText("Modo: 2 Jugadores");
});

document.getElementById("restart").addEventListener("click", () => {
  generateMap();
  player1.kills = 0;
  player2.kills = 0;
  player1.respawn();
  player2.respawn();
  showOverlayText("Juego reiniciado");
});

// ===========================================================
// INICIO DEL JUEGO
// ===========================================================
spawnPlayers("1p");   // arranca en modo 1 jugador (bot)
requestAnimationFrame(loop); // inicia el bucle principal
