(() => {
  const GRID = 24;
  const TILE = 20;
  const canvas = document.getElementById('game-canvas');
  const scoreEl = document.getElementById('score');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const polaroidBtn = document.getElementById('polaroidBtn');
  const downloadLink = document.getElementById('downloadLink');

  canvas.width = GRID * TILE;
  canvas.height = GRID * TILE;
  const ctx = canvas.getContext('2d');

  let snake = [{x:12,y:12},{x:11,y:12},{x:10,y:12}];
  let dir = {x:1,y:0};
  let food = null;
  let score = 0;
  let running = false;
  let tickInterval = null;
  let hasEnded = false;

  function placeFood(){
    // If board nearly full, fallback to scanning for free cell to avoid long loops
    if (snake.length >= GRID * GRID - 2) {
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          if (!snake.some(s => s.x === x && s.y === y)) { food = {x, y}; return; }
        }
      }
    }

    while(true){
      const f = {x: Math.floor(Math.random()*GRID), y: Math.floor(Math.random()*GRID)};
      const overlap = snake.some(s => s.x === f.x && s.y === f.y);
      if(!overlap){ food = f; return; }
    }
  }

  function updateHud(){
    scoreEl.textContent = score;
    if (hasEnded) return; // keep Game Over message visible
    statusEl.textContent = running ? 'Running' : 'Paused';
  }

  function draw(){
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if(food){
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(food.x*TILE, food.y*TILE, TILE, TILE);
    }

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#d3ff7a' : '#92c84a';
      ctx.fillRect(seg.x*TILE, seg.y*TILE, TILE, TILE);
    });
  }

  function gameOver(msg){
    running = false;
    hasEnded = true;
    clearInterval(tickInterval);
    statusEl.textContent = 'Game Over — ' + msg;
    startBtn.textContent = 'Restart';
  }

  function step(){
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

    if(head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID){
      gameOver('Wall hit');
      return;
    }

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
      placeFood();
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
    clearInterval(tickInterval);
    tickInterval = setInterval(step, 120);
  }

  function pauseGame(){
    if (hasEnded) return;
    running = false;
    clearInterval(tickInterval);
    updateHud();
  }

  function resetGame(){
    clearInterval(tickInterval);
    snake = [{x:12,y:12},{x:11,y:12},{x:10,y:12}];
    dir = {x:1,y:0};
    score = 0;
    hasEnded = false;
    placeFood();
    draw();
    updateHud();
    statusEl.textContent = 'Ready';
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
    if(e.key === 'r' || e.key === 'R') resetGame();
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', pauseGame);
  polaroidBtn.addEventListener('click', takePolaroid);

  placeFood();
  draw();
  updateHud();
})();
