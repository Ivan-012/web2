const canvas = document.getElementById("cancha");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const juego = document.getElementById("juego");
const btnJugar = document.getElementById("btnJugar");
const volverMenu = document.getElementById("volverMenu");
const subirVel = document.getElementById("subirVel");
const bajarVel = document.getElementById("bajarVel");
const velocidadTexto = document.getElementById("velocidadTexto");
const golesTexto = document.getElementById("goles");
const mensaje = document.getElementById("mensaje");
const golSound = document.getElementById("golSound");
const equipoSelect = document.getElementById("equipo");

let pelota = { x: 120, y: 220, radio: 10, dx: 0, dy: 0, color1: "red", color2: "blue" };
let arquero = { x: 720, y: 150, ancho: 25, alto: 100, dy: 6 };
let arco = { x: 700, y: 50, ancho: 90, alto: 350 };
let goles = 0;
let jugando = false;
let puedePatear = true;
let golRegistrado = false; // 🔹 Evita sumar más de un gol o fallo por jugada

// Dibuja el arco con líneas simulando red
function dibujarArco() {
  ctx.strokeStyle = "white";
  ctx.lineWidth = 6;
  ctx.strokeRect(arco.x, arco.y, arco.ancho, arco.alto);

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  for (let i = arco.y; i < arco.y + arco.alto; i += 15) {
    ctx.moveTo(arco.x, i);
    ctx.lineTo(arco.x + arco.ancho, i);
  }
  for (let j = arco.x; j < arco.x + arco.ancho; j += 15) {
    ctx.moveTo(j, arco.y);
    ctx.lineTo(j, arco.y + arco.alto);
  }
  ctx.stroke();
  ctx.closePath();
}

// Dibuja la pelota con los colores del equipo
function dibujarPelota() {
  const grad = ctx.createLinearGradient(pelota.x - pelota.radio, pelota.y, pelota.x + pelota.radio, pelota.y);
  grad.addColorStop(0, pelota.color1);
  grad.addColorStop(1, pelota.color2);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pelota.x, pelota.y, pelota.radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}

function dibujarArquero() {
  ctx.fillStyle = "yellow";
  ctx.fillRect(arquero.x, arquero.y, arquero.ancho, arquero.alto);
}

function moverArquero() {
  arquero.y += arquero.dy;
  if (arquero.y <= arco.y || arquero.y + arquero.alto >= arco.y + arco.alto) {
    arquero.dy *= -1;
  }
}

function moverPelota() {
  pelota.x += pelota.dx;
  pelota.y += pelota.dy;

  // Rebote con bordes
  if (pelota.y - pelota.radio <= 0 || pelota.y + pelota.radio >= canvas.height) {
    pelota.dy *= -1;
  }

  // Rebote con el arquero
  if (
    pelota.x + pelota.radio > arquero.x &&
    pelota.x - pelota.radio < arquero.x + arquero.ancho &&
    pelota.y > arquero.y &&
    pelota.y < arquero.y + arquero.alto &&
    !golRegistrado
  ) {
    golRegistrado = true;
    pelota.dx = -pelota.dx * 0.5;
    pelota.dy = (Math.random() - 0.5) * 4;
    mostrarMensaje("ATAJADA 🧤", "cyan");
    setTimeout(() => {
      reiniciarPelota();
      golRegistrado = false;
    }, 1000);
  }

  // Gol válido (pasa al arquero)
  if (
    pelota.x + pelota.radio > arco.x &&
    pelota.y > arco.y &&
    pelota.y < arco.y + arco.alto &&
    pelota.x > arquero.x + arquero.ancho &&
    !golRegistrado
  ) {
    golRegistrado = true;
    goles++;
    golesTexto.textContent = goles;
    golSound.play();
    mostrarMensaje("¡GOOOL! ⚽", "yellow");
    setTimeout(() => {
      reiniciarPelota();
      golRegistrado = false;
    }, 1000);
  }

  // Fallo (pasa del arco sin entrar)
  if (pelota.x > canvas.width + 20 && !golRegistrado) {
    golRegistrado = true;
    mostrarMensaje("¡Falló 😬!", "red");
    setTimeout(() => {
      reiniciarPelota();
      golRegistrado = false;
    }, 1000);
  }
}

function reiniciarPelota() {
  pelota.x = 120;
  pelota.y = 220;
  pelota.dx = 0;
  pelota.dy = 0;
  puedePatear = true;
}

function animar() {
  if (!jugando) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dibujarArco();
  dibujarArquero();
  dibujarPelota();
  moverArquero();
  moverPelota();
  requestAnimationFrame(animar);
}

// Disparo con clic
canvas.addEventListener("click", (e) => {
  if (!puedePatear) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const angle = Math.atan2(clickY - pelota.y, clickX - pelota.x);
  const velocidad = 10;
  pelota.dx = Math.cos(angle) * velocidad;
  pelota.dy = Math.sin(angle) * velocidad;
  puedePatear = false;
});

// Controlar velocidad del arquero
subirVel.addEventListener("click", (e) => {
  e.stopPropagation();
  arquero.dy += arquero.dy > 0 ? 1 : -1;
  velocidadTexto.textContent = Math.abs(arquero.dy);
});

bajarVel.addEventListener("click", (e) => {
  e.stopPropagation();
  if (Math.abs(arquero.dy) > 1) arquero.dy += arquero.dy > 0 ? -1 : 1;
  velocidadTexto.textContent = Math.abs(arquero.dy);
});

// Iniciar juego
btnJugar.addEventListener("click", () => {
  const equipo = equipoSelect.value;
  if (equipo === "San Lorenzo") {
    pelota.color1 = "red";
    pelota.color2 = "blue";
  } else if (equipo === "Boca") {
    pelota.color1 = "blue";
    pelota.color2 = "yellow";
  } else if (equipo === "River") {
    pelota.color1 = "white";
    pelota.color2 = "red";
  }

  menu.style.display = "none";
  juego.style.display = "block";
  jugando = true;
  animar();
});

// Volver al menú
volverMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  jugando = false;
  menu.style.display = "block";
  juego.style.display = "none";
  reiniciarPelota();
});

// Mensaje animado
function mostrarMensaje(texto, color) {
  mensaje.textContent = texto;
  mensaje.style.color = color;
  mensaje.classList.add("visible");
  setTimeout(() => mensaje.classList.remove("visible"), 900);
}