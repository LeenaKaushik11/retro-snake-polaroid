(() => {
  const GRID = 24;
  const TILE = 20;
  const canvas = document.getElementById('game-canvas');
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const polaroidBtn = document.getElementById('polaroidBtn');
  const downloadLink = document.getElementById('downloadLink');

  canvas.width = GRID * TILE;
  canvas.height = GRID * TILE;
  const ctx = canvas.getContext('2d');

  let snake = [];
  let dir = {x:1,y:0};
  let food = null;
  let score = 0;
  let running = false;
  let tickInterval = null;
  let hasEnded = false;

  let highScore = parseInt(localStorage.getItem('retroSnakeHigh') || '0', 10) || 0;
  function saveHigh(){
    localStorage.setItem('retroSnakeHigh', String(highScore));
    highEl.textContent = highScore;
  }

  function isTouchDevice(){
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  }

  const MIN_TICK_MS = 60;
  const BASE_TICK_MS = 140;
  function computeTickMs(){
    const base = isTouchDevice() ? BASE_TICK_MS + 80 : BASE_TICK_MS;
    return Math.max(MIN_TICK_MS, base - score * 6 - Math.floor((snake.length - 3) / 2) * 2);
  }

  function restartTicker(){
    if (!running) return;
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(step, computeTickMs());
  }

  function placeFood(){
    if (snake.length >= GRID * GRID - 2) {
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          if (!snake.some(s => s.x === x && s.y === y)) { food = {x, y}; return; }
        }
      }
    }

    for (let i = 0; i < 1000; i++) {
      const f = {x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID)};
      if (!snake.some(s => s.x === f.x && s.y === f.y)) { food = f; return; }
    }

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!snake.some(s => s.x === x && s.y === y)) { food = {x, y}; return; }
      }
    }
  }

  function updateHud(forceText) {
    scoreEl.textContent = score;
    highEl.textContent = highScore;
    if (forceText) {
      statusEl.textContent = forceText;
      return;
    }
    if (hasEnded) return;
    statusEl.textContent = running ? 'Running' : 'Paused';
  }

  function draw(){
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if (food) {
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(food.x*TILE, food.y*TILE, TILE, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(food.x*TILE+1, food.y*TILE+1, TILE-2, TILE-4);
    }

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#d3ff7a' : '#92c84a';
      ctx.fillRect(seg.x*TILE, seg.y*TILE, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(seg.x*TILE+1, seg.y*TILE+1, TILE-2, TILE-2);
    });
  }

  function clearTicker(){
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  function gameOver(msg){
    running = false;
    hasEnded = true;
    clearTicker();
    updateHud('Game Over — ' + msg);
    startBtn.textContent = 'Restart';
    if (score > highScore) {
      highScore = score;
      saveHigh();
    }
  }

  function step(){
    let hx = snake[0].x + dir.x;
    let hy = snake[0].y + dir.y;
    if (hx < 0) hx = GRID - 1;
    if (hx >= GRID) hx = 0;
    if (hy < 0) hy = GRID - 1;
    if (hy >= GRID) hy = 0;
    const head = {x: hx, y: hy};

    const willEat = food && head.x === food.x && head.y === food.y;
    const nextSnake = [head, ...snake];
    if (!willEat) nextSnake.pop();

    const bodyToCheck = nextSnake.slice(1);
    if (bodyToCheck.some(seg => seg.x === head.x && seg.y === head.y)) {
      gameOver('You bit yourself!');
      return;
    }

    snake = nextSnake;

    if (willEat) {
      score++;
      if (score > highScore) { highScore = score; saveHigh(); }
      placeFood();
      restartTicker();
    }

    draw();
    updateHud();
  }

  function startGame(){
    if (running) return;
    if (hasEnded) resetGame();
    running = true;
    hasEnded = false;
    startBtn.textContent = 'Start';
    updateHud();
    clearTicker();
    tickInterval = setInterval(step, computeTickMs());
  }

  function pauseGame(){
    if (hasEnded) return;
    running = false;
    clearTicker();
    updateHud('Paused');
  }

  function resetGame(){
    clearTicker();
    const cx = Math.floor(GRID/2);
    const cy = Math.floor(GRID/2);
    snake = [{x:cx, y:cy}, {x:cx-1, y:cy}, {x:cx-2, y:cy}];
    dir = {x:1, y:0};
    score = 0;
    hasEnded = false;
    placeFood();
    draw();
    updateHud('Ready');
    startBtn.textContent = 'Start';
  }

  function takePolaroid(){
    const photo = document.createElement('canvas');
    photo.width = canvas.width * 2;
    photo.height = canvas.height * 2 + 120;
    const pctx = photo.getContext('2d');

    pctx.fillStyle = '#fffdf6';
    pctx.fillRect(0,0,photo.width,photo.height);

    const tiny = document.createElement('canvas');
    tiny.width = 120;
    tiny.height = 120;
    const tctx = tiny.getContext('2d');
    tctx.drawImage(canvas, 0, 0, tiny.width, tiny.height);

    pctx.filter = 'sepia(0.4) contrast(1.1)';
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(tiny, 40, 30, photo.width - 80, photo.height - 140);
    pctx.filter = 'none';

    pctx.strokeStyle = 'rgba(0,0,0,0.12)';
    pctx.lineWidth = 2;
    pctx.strokeRect(40, 30, photo.width - 80, photo.height - 140);

    pctx.fillStyle = '#111';
    pctx.font = '20px monospace';
    pctx.textAlign = 'center';
    pctx.fillText('Retro Snake Snapshot', photo.width/2, photo.height - 40);

    const dataUrl = photo.toDataURL('image/png');
    downloadLink.href = dataUrl;
    downloadLink.download = `retro-snake-polaroid-${Date.now()}.png`;
    downloadLink.style.display = 'inline-block';
    downloadLink.textContent = 'Download Polaroid';
  }

  function touchStartsInActiveArea(clientX, clientY) {
    const lowerRegion = clientY > window.innerHeight * 0.25 && clientY < window.innerHeight * 0.98;
    const onCanvas = clientY >= canvas.getBoundingClientRect().top && clientY <= canvas.getBoundingClientRect().bottom &&
      clientX >= canvas.getBoundingClientRect().left && clientX <= canvas.getBoundingClientRect().right;
    return lowerRegion || onCanvas;
  }

  function initTouchQuickActions(){
    if (!isTouchDevice()) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let didMove = false;
    let inActiveArea = false;

    const toggleGameState = () => {
      if (hasEnded) {
        resetGame();
        startGame();
      } else if (running) {
        pauseGame();
      } else {
        startGame();
      }
    };

    document.addEventListener('touchstart', (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;
      const t = ev.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
      didMove = false;
      inActiveArea = touchStartsInActiveArea(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchmove', (ev) => {
      if (!inActiveArea) return;
      if (!ev.touches || ev.touches.length === 0) return;
      const t = ev.touches[0];
      const dx = Math.abs(t.clientX - touchStartX);
      const dy = Math.abs(t.clientY - touchStartY);
      if (dx > 12 || dy > 12) didMove = true;
      ev.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', (ev) => {
      if (!inActiveArea) return;
      const t = (ev.changedTouches && ev.changedTouches[0]) || null;
      if (!t) return;
      if (didMove) return;

      const elapsed = Date.now() - touchStartTime;
      if (elapsed >= 500) {
        resetGame();
        return;
      }

      toggleGameState();
    }, { passive: true });
  }

  function initSwipeControls(){
    const vjoy = document.getElementById('vjoy');
    if (vjoy) vjoy.style.display = 'none';
    if (!isTouchDevice()) return;

    let startX = 0, startY = 0;
    let inActiveArea = false;
    const THRESHOLD = 20;

    document.addEventListener('touchstart', (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;
      const t = ev.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      inActiveArea = touchStartsInActiveArea(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchmove', (ev) => {
      if (!inActiveArea) return;
      if (!ev.touches || ev.touches.length === 0) return;
      ev.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', (ev) => {
      if (!inActiveArea) return;
      const t = (ev.changedTouches && ev.changedTouches[0]) || null;
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < THRESHOLD) return;

      let nextDir = null;
      if (absX > absY) {
        nextDir = dx > 0 ? {x:1,y:0} : {x:-1,y:0};
      } else {
        nextDir = dy > 0 ? {x:0,y:1} : {x:0,y:-1};
      }

      if (!(nextDir.x === -dir.x && nextDir.y === -dir.y)) dir = nextDir;
      if (!running) startGame();
    }, { passive: true });
  }

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const inTextInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

    const map = {
      ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0},
      w: {x:0,y:-1}, s: {x:0,y:1}, a: {x:-1,y:0}, d: {x:1,y:0},
      W: {x:0,y:-1}, S: {x:0,y:1}, A: {x:-1,y:0}, D: {x:1,y:0}
    };

    const next = map[e.key];
    if (next && !inTextInput) {
      e.preventDefault();
      if (hasEnded) {
        resetGame();
        if (!(next.x === -dir.x && next.y === -dir.y)) dir = next;
        startGame();
        return;
      }
      if (!(next.x === -dir.x && next.y === -dir.y)) dir = next;
      if (!running) startGame();
    }

    const isSpace = (e.code === 'Space') || (e.key === ' ') || (e.key === 'Spacebar');
    if (isSpace && !inTextInput) {
      e.preventDefault();
      if (hasEnded) {
        resetGame();
        startGame();
      } else if (running) {
        pauseGame();
      } else {
        startGame();
      }
    }

    if (!inTextInput && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      resetGame();
    }
  });

  startBtn.addEventListener('click', () => {
    if (hasEnded) { resetGame(); startGame(); }
    else if (!running) startGame();
  });

  pauseBtn.addEventListener('click', () => {
    if (running) pauseGame(); else startGame();
  });
  polaroidBtn.addEventListener('click', takePolaroid);

  initTouchQuickActions();
  initSwipeControls();
  saveHigh();
  resetGame();
})();
