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

  function computeTickMs(){
    // base 140ms, faster as score increases; clamp at 40ms
    const ms = Math.max(40, 140 - score * 6 - Math.floor((snake.length - 3) / 2) * 2);
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

  document.addEventListener('keydown', (e) => {
    const map = {
      ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0},
      w: {x:0,y:-1}, s: {x:0,y:1}, a: {x:-1,y:0}, d: {x:1,y:0},
      W: {x:0,y:-1}, S: {x:0,y:1}, A: {x:-1,y:0}, D: {x:1,y:0}
    };
    const next = map[e.key];
    if(next){
      if (hasEnded) {
        // Reset to a known safe state before accepting direction input
        resetGame();
        // only accept the new direction if it's not the immediate reverse of the default direction
        if (!(next.x === -dir.x && next.y === -dir.y)) {
          dir = next;
        }
        startGame();
      } else {
        // normal input: prevent direct reversal
        if (!(next.x === -dir.x && next.y === -dir.y)) {
          dir = next;
        }
        if(!running) startGame();
      }
    }

    // Space toggles play/pause
    if (e.code === 'Space') {
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

    // 'R' to reset while paused or running; after reset, game stays paused
    if (e.key === 'r' || e.key === 'R') resetGame();
  });

  startBtn.addEventListener('click', () => {
    if (hasEnded) { resetGame(); startGame(); }
    else if (!running) startGame();
  });

  pauseBtn.addEventListener('click', () => {
    if (running) pauseGame(); else startGame();
  });
  polaroidBtn.addEventListener('click', takePolaroid);

  // initial setup
  saveHigh();
  resetGame();
})();
