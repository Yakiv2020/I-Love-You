const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restartBtn");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  restart();
});

const hearts = [];
const sparks = [];
const floatingHearts = [];

let frame = 0;
let pulse = 0;
let heartReadyFrame = null;
let releaseStarted = false;
let textFinishedFrame = null;
let textPoints = [];

const START_DELAY = 90;
const TEXT = "Я ТЕБЕ ЛЮБЛЮ";
const FINAL_SCENE_TIME = 1200;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function easeInOutQuad(t) {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function getDeviceConfig() {
  const w = canvas.width;

  if (w < 600) {
  return {
    centerY: 0.28,
    scale: 38,
    heartCount: 120,
    fontSize: 48,
    textY: 0.78,
    textGap: 6,
    textHeartSizeMin: 4,
    textHeartSizeMax: 6
  };
}

  if (w < 1024) {
    return {
      centerY: 0.31,
      scale: 38,
      heartCount: 140,
      fontSize: 76,
      textY: 0.82,
      textGap: 8,
      textHeartSizeMin: 5,
      textHeartSizeMax: 7
    };
  }

  return {
    centerY: 0.33,
    scale: 42,
    heartCount: 160,
    fontSize: 125,
    textY: 0.88,
    textGap: 10,
    textHeartSizeMin: 6,
    textHeartSizeMax: 9
  };
}

function drawHeart(x, y, size, color, alpha = 1, angle = 0, glow = 15) {
  ctx.save();

  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  ctx.globalAlpha = alpha;

  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(0, -0.3);
  ctx.bezierCurveTo(0.5, -1, 1, -0.2, 0, 0.8);
  ctx.bezierCurveTo(-1, -0.2, -0.5, -1, 0, -0.3);
  ctx.fill();

  ctx.restore();
}

function heartPoint(t, scale, offsetX, offsetY) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t)
  );

  return {
    x: offsetX + x * scale,
    y: offsetY + y * scale
  };
}

function bezierPoint(start, control, end, t) {
  return {
    x:
      (1 - t) * (1 - t) * start.x +
      2 * (1 - t) * t * control.x +
      t * t * end.x,

    y:
      (1 - t) * (1 - t) * start.y +
      2 * (1 - t) * t * control.y +
      t * t * end.y
  };
}

function createHearts() {
  hearts.length = 0;

  const config = getDeviceConfig();

const centerX = canvas.width / 2;
const centerY = canvas.height * config.centerY;
const scale = Math.min(canvas.width, canvas.height) / config.scale;
const count = config.heartCount;

  for (let i = 0; i < count; i++) {
    const t = (Math.PI * 2 * i) / count;
    const target = heartPoint(t, scale, centerX, centerY);

    const side = Math.floor(random(0, 4));

    let startX;
    let startY;

    if (side === 0) {
      startX = random(0, canvas.width);
      startY = -30;
    } else if (side === 1) {
      startX = canvas.width + 30;
      startY = random(0, canvas.height);
    } else if (side === 2) {
      startX = random(0, canvas.width);
      startY = canvas.height + 30;
    } else {
      startX = -30;
      startY = random(0, canvas.height);
    }

    hearts.push({
      type: "main",

      startX,
      startY,
      x: startX,
      y: startY,

      targetX: target.x,
      targetY: target.y,
      baseX: target.x,
      baseY: target.y,

      controlX: (startX + target.x) / 2 + random(-200, 200),
      controlY: (startY + target.y) / 2 + random(-200, 200),

      size: random(10, 16),
      angle: random(0, Math.PI * 2),
      rotationSpeed: random(-0.03, 0.03),

      danceOffset: random(0, Math.PI * 2),
      dancePower: random(4, 10),

      progress: 0,
      duration: random(70, 95),
      delay: random(0, 8),

      released: false,
      releaseProgress: 0,
      releaseDelay: 0,
      releaseDuration: 0,

      releaseStartX: 0,
      releaseStartY: 0,
      releaseTargetX: 0,
      releaseTargetY: 0,
      releaseControlX: 0,
      releaseControlY: 0,

      trail: [],
      trailLimit: 14
    });
  }
}

function getTextPoints() {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  tempCtx.fillStyle = "white";
  tempCtx.textAlign = "center";
  tempCtx.textBaseline = "middle";
  const config = getDeviceConfig();

tempCtx.font = `bold ${config.fontSize}px Arial`;

tempCtx.fillText(
  TEXT,
  canvas.width / 2,
  canvas.height * config.textY
);

  const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  const points = [];
  const gap = config.textGap;

  for (let y = 0; y < canvas.height; y += gap) {
    for (let x = 0; x < canvas.width; x += gap) {
      const index = (y * canvas.width + x) * 4;
      const alpha = imageData.data[index + 3];

      if (alpha > 100) {
        points.push({ x, y });
      }
    }
  }

  points.sort((a, b) => a.x - b.x);

  return points;
}

function drawBackground() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) * 0.65
  );

  gradient.addColorStop(0, "rgba(255, 30, 30, 0.12)");
  gradient.addColorStop(0.5, "rgba(90, 0, 0, 0.05)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCenterGlow() {
  if (frame > START_DELAY + 40) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const glowPulse = 1 + Math.sin(frame * 0.12) * 0.25;
  const alpha = Math.min(frame / 60, 1);

  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    120 * glowPulse
  );

  gradient.addColorStop(0, `rgba(255, 245, 245, ${0.8 * alpha})`);
  gradient.addColorStop(0.25, `rgba(255, 80, 80, ${0.35 * alpha})`);
  gradient.addColorStop(0.6, `rgba(255, 0, 0, ${0.15 * alpha})`);
  gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function heartbeat(t) {
  const cycle = t % 90;

  if (cycle < 10) {
    return Math.sin((cycle / 10) * Math.PI);
  }

  if (cycle > 16 && cycle < 28) {
    return Math.sin(((cycle - 16) / 12) * Math.PI) * 0.65;
  }

  return 0;
}
function updateHeart(heart) {
  if (frame < START_DELAY + heart.delay) return;

  if (!heart.released) {
    heart.progress += 1 / heart.duration;

    if (heart.progress > 1) {
      heart.progress = 1;
    }

    const eased = easeInOutQuad(heart.progress);

    const point = bezierPoint(
      { x: heart.startX, y: heart.startY },
      { x: heart.controlX, y: heart.controlY },
      { x: heart.targetX, y: heart.targetY },
      eased
    );

    heart.x = point.x;
    heart.y = point.y;

    if (
      heart.progress >= 1 &&
      heartReadyFrame !== null &&
      frame > heartReadyFrame + 40
    ) {
      const dx = heart.baseX - canvas.width / 2;
      const config = getDeviceConfig();
      const dy = heart.baseY - canvas.height * config.centerY;
      const beat = heartbeat(frame - heartReadyFrame) * 0.06;

      heart.x = heart.baseX + dx * beat;
      heart.y = heart.baseY + dy * beat;
    }
  }

  if (heart.released) {
    if (frame >= heart.releaseStartFrame + heart.releaseDelay) {
      heart.releaseProgress += 1 / heart.releaseDuration;

      if (heart.releaseProgress > 1) {
        heart.releaseProgress = 1;
      }

      const eased = easeInOutQuad(heart.releaseProgress);

      const point = bezierPoint(
        { x: heart.releaseStartX, y: heart.releaseStartY },
        { x: heart.releaseControlX, y: heart.releaseControlY },
        { x: heart.releaseTargetX, y: heart.releaseTargetY },
        eased
      );

      heart.x = point.x;
      heart.y = point.y;
    }
  }

  heart.angle += heart.rotationSpeed;

  heart.trail.push({ x: heart.x, y: heart.y });

  if (heart.trail.length > heart.trailLimit) {
    heart.trail.shift();
  }
}

function drawTrail(heart) {
  if (heart.trail.length < 2) return;

  ctx.save();

  ctx.strokeStyle = "red";
  ctx.lineWidth = heart.released ? 2 : 3;
  ctx.globalAlpha = heart.released ? 0.1 : 0.26;
  ctx.shadowColor = "red";
  ctx.shadowBlur = heart.released ? 5 : 10;

  ctx.beginPath();
  ctx.moveTo(heart.trail[0].x, heart.trail[0].y);

  for (let i = 1; i < heart.trail.length; i++) {
    ctx.lineTo(heart.trail[i].x, heart.trail[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawHeartObject(heart) {
  const danceX =
    Math.sin(frame * 0.08 + heart.danceOffset) *
    heart.dancePower *
    (1 - heart.progress);

  const danceY =
    Math.cos(frame * 0.08 + heart.danceOffset) *
    heart.dancePower *
    (1 - heart.progress);

  let textBreath = 1;

if (
  heart.released &&
  textFinishedFrame !== null &&
  frame > textFinishedFrame
) {
  textBreath = 1 + Math.sin(frame * 0.04) * 0.2;
}

const drawSize =
  heart.size *
  (0.7 + heart.progress * 0.3) *
  textBreath;

  const lightness = 92 - heart.progress * 28;
  const saturation = 25 + heart.progress * 75;
  const color = `hsl(0, ${saturation}%, ${lightness}%)`;

  drawHeart(
    heart.x + danceX,
    heart.y + danceY,
    drawSize,
    color,
    1,
    heart.angle
  );
}

function startReleaseHearts() {
  const mainHearts = hearts.filter(heart => !heart.released);
  const releaseStartFrame = frame;
  const config = getDeviceConfig();

  for (let i = 0; i < textPoints.length; i++) {
    const original = mainHearts[Math.floor(random(0, mainHearts.length))];
    const target = textPoints[i];

    hearts.push({
      ...original,

      type: "text",
      released: true,

      x: original.x,
      y: original.y,

      releaseProgress: 0,
      releaseDelay: i * 0.25,
      releaseDuration: random(22, 35),
      releaseStartFrame,

      releaseStartX: original.x,
      releaseStartY: original.y,

      releaseTargetX: target.x,
      releaseTargetY: target.y,

      releaseControlX: (original.x + target.x) / 2 + random(-120, 120),
      releaseControlY: (original.y + target.y) / 2 + random(-160, 60),

      size: random(config.textHeartSizeMin, config.textHeartSizeMax),
      trail: [],
      trailLimit: 5
    });
  }

  textFinishedFrame = releaseStartFrame + textPoints.length * 0.25 + 80;
}

function drawTextGlow() {
  if (textFinishedFrame === null || frame < textFinishedFrame) return;

  const alpha = Math.min((frame - textFinishedFrame) / 80, 1);

  ctx.save();

  ctx.globalAlpha = alpha * 0.28;
  ctx.shadowColor = "red";
  ctx.shadowBlur = 35;
  ctx.fillStyle = "rgba(255, 0, 0, 0.18)";

  const config = getDeviceConfig();

ctx.font = `bold ${config.fontSize}px Arial`;

ctx.fillText(
  TEXT,
  canvas.width / 2,
  canvas.height * config.textY
);

  ctx.restore();
}

function createSpark() {
  sparks.push({
    x: random(0, canvas.width),
    y: random(canvas.height * 0.15, canvas.height * 0.9),
    size: random(1, 3),
    speedY: random(0.3, 1),
    alpha: 1,
    life: random(80, 140)
  });
}

function updateSparks() {
 if (
  textFinishedFrame !== null &&
  frame > textFinishedFrame &&
  sparks.length < 80 &&
  Math.random() < 0.25
) {
  createSpark();
}

  for (let i = sparks.length - 1; i >= 0; i--) {
    const spark = sparks[i];

    spark.y += spark.speedY;
    spark.alpha -= 0.008;
    spark.life--;

    ctx.save();
    ctx.globalAlpha = spark.alpha;
    ctx.fillStyle = "rgba(255, 180, 180, 1)";
    ctx.shadowColor = "red";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (spark.alpha <= 0 || spark.life <= 0) {
      sparks.splice(i, 1);
    }
  }
}

function checkSceneState() {
  if (
    heartReadyFrame === null &&
    hearts.length > 0 &&
    hearts.every(heart => heart.released || heart.progress >= 1)
  ) {
    heartReadyFrame = frame;
  }

  if (
    heartReadyFrame !== null &&
    frame > heartReadyFrame + 320 &&
    !releaseStarted
  ) {
    startReleaseHearts();
    releaseStarted = true;
  }
}
function checkRestart() {
  if (
    textFinishedFrame !== null &&
    frame > textFinishedFrame + FINAL_SCENE_TIME
  ) {
    restart();
  }
}

function restart() {
  hearts.length = 0;
  sparks.length = 0;
  floatingHearts.length = 0;
  frame = 0;
  pulse = 0;
  heartReadyFrame = null;
  releaseStarted = false;
  textFinishedFrame = null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  createHearts();
  textPoints = getTextPoints();
}

function createFloatingHeart() {
    let color;

const colorRandom = Math.random();

if (colorRandom < 0.7) {
  color = "rgba(255, 90, 90, 1)";
} else if (colorRandom < 0.9) {
  color = "rgba(255, 150, 170, 1)";
} else {
  color = "rgba(255, 210, 120, 1)";
}
  floatingHearts.push({
    x: random(-30, canvas.width + 30),
    y: random(-30, canvas.height + 30),
 
    color,

    size: random(5, 11),

    speedY: random(0.2, 0.8),
    speedX: random(-0.4, 0.4),

    alpha: random(0.15, 0.8),

    angle: random(0, Math.PI * 2),
    rotationSpeed: random(-0.015, 0.015),

    waveOffset: random(0, Math.PI * 2),
    wavePower: random(8, 25),
    waveSpeed: random(0.015, 0.04),

    life: random(350, 550),
    flash: Math.random() < 0.08,
    flashSpeed: random(0.15, 0.3),

    scaleSpeed: random(0.015, 0.04),
    scaleOffset: random(0, Math.PI * 2)
    
});
}

function updateFloatingHearts() {
 if (
  textFinishedFrame !== null &&
  frame > textFinishedFrame &&
  floatingHearts.length < 120 &&
  Math.random() < 0.35
) {
  createFloatingHeart();
}

  for (let i = floatingHearts.length - 1; i >= 0; i--) {
    const heart = floatingHearts[i];

    heart.x +=
    heart.speedX +
    Math.sin(frame * heart.waveSpeed + heart.waveOffset) *
    (heart.wavePower / 20);
    heart.y -= heart.speedY;
    heart.angle += heart.rotationSpeed;

    heart.alpha -= 0.002;
    heart.life--;

    const currentSize =
  heart.size *
  (1 + Math.sin(frame * heart.scaleSpeed + heart.scaleOffset) * 0.25);

const currentAlpha =
  heart.alpha *
  (0.75 + Math.sin(frame * heart.scaleSpeed + heart.scaleOffset) * 0.25);
let alpha = currentAlpha;
if (heart.flash) {
  alpha += Math.sin(frame * heart.flashSpeed) * 0.35;

  if (alpha > 1) alpha = 1;
  if (alpha < 0.05) alpha = 0.05;
}
drawHeart(
  heart.x,
  heart.y,
  currentSize,
  heart.color,
  alpha,
  heart.angle,
  6
);

    if (heart.alpha <= 0.05 || heart.life <= 0 || heart.y < -100) {
      floatingHearts.splice(i, 1);
    }
  }
}
function drawFinalShine() {
  if (textFinishedFrame === null || frame < textFinishedFrame + 80) return;

  const shineAlpha =
    Math.sin((frame - textFinishedFrame) * 0.03) * 0.15 + 0.15;

  ctx.save();

  ctx.globalAlpha = shineAlpha;
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.shadowColor = "white";
  ctx.shadowBlur = 25;

  ctx.beginPath();
 const config = getDeviceConfig();

ctx.arc(
  canvas.width / 2,
  canvas.height * config.textY,
  4,
  0,
  Math.PI * 2
);
  ctx.fill();

  ctx.restore();
}
function animate() {
  frame++;
  pulse += 0.05;

  drawBackground();
  drawCenterGlow();
  drawTextGlow();
  updateSparks();
  updateFloatingHearts();

  for (const heart of hearts) {
    updateHeart(heart);
    drawTrail(heart);
    drawHeartObject(heart);
  }

  drawFinalShine();

  checkSceneState();
  checkRestart();

  requestAnimationFrame(animate);
}

restartBtn.addEventListener("click", restart);

restart();
animate();
