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

  // High score persisted in localStorage
  let highScore = parseInt(localStorage.getItem('retroSnakeHigh') || '0', 10) || 0;
  function saveHigh(){
    localStorage.setItem('retroSnakeHigh', String(highScore));
    highEl.textContent = highScore;
  }

  // Touch detection helper
  function isTouchDevice(){
    return (('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);
  }

  // Tick timing limits
  const MIN_TICK_MS = 60; // don't go faster than ~16.7 FPS
  const BASE_TICK_MS = 140;
  function computeTickMs(){
    // make mobile slower: add extra base delay on touch devices
    const base = isTouchDevice() ? BASE_TICK_MS + 80 : BASE_TICK_MS;
    // Score and length influence speed, but clamp to MIN_TICK_MS
    const ms = Math.max(MIN_TICK_MS, base - score * 6 - Math.floor((snake.length - 3) / 2) * 2);
    return ms;
  }

  function restartTicker(){
    if (!running) return;
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(step, computeTickMs());
  }

  function placeFood(){
    // If board nearly full, fallback to scanning for free cell to avoid long loops
    if (snake.length >= GRID * GRID - 2) {
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          if (!snake.some(s => s.x === x && s.y === y)) { food = {x, y}; return; }
        }
      }
    }

    for (let i = 0; i < 1000; i++) {
      const f = {x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID)};
      const overlap = snake.some(s => s.x === f.x && s.y === f.y);
      if(!overlap){ food = f; return; }
    }

    // fallback scan
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
    // if game ended, keep the Game Over text in place
    if (hasEnded) return;
    statusEl.textContent = running ? 'Running' : 'Paused';
  }

  function draw(){
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if(food){
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
    // update high score if needed
    if (score > highScore) {
      highScore = score;
      saveHigh();
    }
  }

  function step(){
    // Compute next head position with wrap-around (classic Nokia behaviour)
    let hx = snake[0].x + dir.x;
    let hy = snake[0].y + dir.y;
    // wrap
    if (hx < 0) hx = GRID - 1;
    if (hx >= GRID) hx = 0;
    if (hy < 0) hy = GRID - 1;
    if (hy >= GRID) hy = 0;
    const head = {x: hx, y: hy};

    const willEat = food && head.x === food.x && head.y === food.y;

    // Build the new snake for collision checking without mutating original yet
    const nextSnake = [head, ...snake];
    if (!willEat) nextSnake.pop();

    // Check collision against the rest of the body (exclude head)
    const bodyToCheck = nextSnake.slice(1);
    if (bodyToCheck.some(seg => seg.x === head.x && seg.y === head.y)){
      gameOver('You bit yourself!');
      return;
    }

    // commit the step
    snake = nextSnake;

    if (willEat) {
      score++;
      // update high score immediately if surpassed
      if (score > highScore) { highScore = score; saveHigh(); }
      placeFood();
      // speed up when eating
      restartTicker();
    }

    draw();
    updateHud();
  }

  function startGame(){
    // if the game already running, nothing to do
    if (running) return;

    // If previous round ended, reset first
    if (hasEnded) {
      resetGame();
    }

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
    snake = [{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
    dir = {x:1,y:0};
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

  // --- Swipe controls for touch devices (preferred over joystick) ---
  function initSwipeControls(){
    const vjoy = document.getElementById('vjoy');
    if (vjoy) vjoy.style.display = 'none';

    if (!isTouchDevice()) return;

    let startX = 0, startY = 0;
    const THRESHOLD = 20; // px to count as swipe

    canvas.addEventListener('touchstart', (ev) => {
      if (!ev.touches || ev.touches.length === 0) return;
      ev.preventDefault();
      const t = ev.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (ev) => {
      // prevent the page from scrolling when swiping across the game canvas
      if (!ev.touches || ev.touches.length === 0) return;
      ev.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (ev) => {
      const t = (ev.changedTouches && ev.changedTouches[0]) || null;
      if (!t) return;
      ev.preventDefault();
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < THRESHOLD) {
        // treat as tap — optionally start the game if paused
        if (!running && !hasEnded) startGame();
        return;
      }

      // Choose dominant axis to map to cardinal direction
      let nextDir = null;
      if (absX > absY) {
        nextDir = dx > 0 ? {x:1,y:0} : {x:-1,y:0};
      } else {
        nextDir = dy > 0 ? {x:0,y:1} : {x:0,y:-1};
      }

      // prevent immediate reverse
      if (!(nextDir.x === -dir.x && nextDir.y === -dir.y)){
        dir = nextDir;
      }
      if (!running) startGame();
    }, { passive: false });
  }

  // Robust keyboard handling including preventing default scroll behavior
  document.addEventListener('keydown', (e) => {
    // don't intercept when user is typing in an input/textarea/contenteditable
    const active = document.activeElement;
    const inTextInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

    const map = {
      ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0},
      w: {x:0,y:-1}, s: {x:0,y:1}, a: {x:-1,y:0}, d: {x:1,y:0},
      W: {x:0,y:-1}, S: {x:0,y:1}, A: {x:-1,y:0}, D: {x:1,y:0}
    };

    const next = map[e.key];
    if (next && !inTextInput) {
      // prevent the browser from scrolling on arrow keys
      e.preventDefault();

      if (hasEnded) {
        resetGame();
        if (!(next.x === -dir.x && next.y === -dir.y)) dir = next;
        startGame();
        return;
      }

      if (!(next.x === -dir.x && next.y === -dir.y)) {
        dir = next;
      }
      if(!running) startGame();
    }

    const isSpace = (e.code === 'Space') || (e.key === ' ') || (e.key === 'Spacebar');
    if (isSpace && !inTextInput) {
      e.preventDefault(); // prevent page scroll on space
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

  // initialize swipe controls for mobile
  initSwipeControls();
  saveHigh();
  resetGame();
})();
