const BLACK = 1;
const WHITE = 2;
const EMPTY = 0;

const boardElement = document.getElementById('board');
const turnElement = document.getElementById('turn');
const capturesElement = document.getElementById('captures');
const messageElement = document.getElementById('message');
const sizeInput = document.getElementById('board-size');
const newGameButton = document.getElementById('new-game');
const passButton = document.getElementById('pass');

let size = 5;
let board = [];
let currentPlayer = BLACK;
let captures = { black: 0, white: 0 };
let passStreak = 0;
let previousBoardSignature = '';

const cloneBoard = (state) => state.map((row) => [...row]);

function boardSignature(state) {
  return state.map((row) => row.join('')).join('|');
}

function createBoard(newSize) {
  return Array.from({ length: newSize }, () => Array(newSize).fill(EMPTY));
}

function getNeighbors(r, c) {
  const neighbors = [];
  if (r > 0) neighbors.push([r - 1, c]);
  if (r < size - 1) neighbors.push([r + 1, c]);
  if (c > 0) neighbors.push([r, c - 1]);
  if (c < size - 1) neighbors.push([r, c + 1]);
  return neighbors;
}

function collectGroup(state, startR, startC) {
  const color = state[startR][startC];
  if (color === EMPTY) return { stones: [], liberties: 0 };

  const seen = new Set([`${startR},${startC}`]);
  const queue = [[startR, startC]];
  const stones = [];
  const libertySet = new Set();

  while (queue.length) {
    const [r, c] = queue.pop();
    stones.push([r, c]);

    for (const [nr, nc] of getNeighbors(r, c)) {
      if (state[nr][nc] === EMPTY) {
        libertySet.add(`${nr},${nc}`);
        continue;
      }
      if (state[nr][nc] !== color) continue;
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([nr, nc]);
    }
  }

  return { stones, liberties: libertySet.size };
}

function removeGroup(state, group) {
  for (const [r, c] of group.stones) {
    state[r][c] = EMPTY;
  }
}

function applyMove(state, r, c, color, koSignature = null) {
  if (state[r][c] !== EMPTY) return { legal: false, captured: 0, nextState: state };

  const nextState = cloneBoard(state);
  nextState[r][c] = color;
  const opponent = color === BLACK ? WHITE : BLACK;
  let captured = 0;

  for (const [nr, nc] of getNeighbors(r, c)) {
    if (nextState[nr][nc] !== opponent) continue;
    const group = collectGroup(nextState, nr, nc);
    if (group.liberties === 0) {
      captured += group.stones.length;
      removeGroup(nextState, group);
    }
  }

  const ownGroup = collectGroup(nextState, r, c);
  if (ownGroup.liberties === 0) {
    return { legal: false, captured: 0, nextState: state };
  }

  const signature = boardSignature(nextState);
  if (koSignature && signature === koSignature) {
    return { legal: false, captured: 0, nextState: state };
  }

  return { legal: true, captured, nextState, signature };
}

function getAllLegalMoves(state, color) {
  const moves = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const trial = applyMove(state, r, c, color, previousBoardSignature);
      if (trial.legal) {
        moves.push({ r, c, trial });
      }
    }
  }
  return moves;
}

function heuristic(move, color) {
  const center = (size - 1) / 2;
  const distanceToCenter = Math.abs(move.r - center) + Math.abs(move.c - center);
  const ownGroup = collectGroup(move.trial.nextState, move.r, move.c);
  const safety = Math.min(ownGroup.liberties, 4);
  const captureBonus = move.trial.captured * 6;
  const centerBonus = Math.max(0, 4 - distanceToCenter);

  const opponent = color === BLACK ? WHITE : BLACK;
  const opponentMoves = getAllLegalMoves(move.trial.nextState, opponent).length;
  const pressureBonus = Math.max(0, size * size * 0.25 - opponentMoves) * 0.06;

  return captureBonus + safety * 1.2 + centerBonus + pressureBonus + Math.random() * 0.3;
}

function aiPlay() {
  const legalMoves = getAllLegalMoves(board, WHITE);

  if (legalMoves.length === 0) {
    passStreak += 1;
    messageElement.textContent = 'AI passes.';
    currentPlayer = BLACK;
    updateStatus();
    checkGameOver();
    return;
  }

  let bestMove = legalMoves[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of legalMoves) {
    const score = heuristic(move, WHITE);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  previousBoardSignature = boardSignature(board);
  board = bestMove.trial.nextState;
  captures.white += bestMove.trial.captured;
  passStreak = 0;
  currentPlayer = BLACK;
  messageElement.textContent = `AI played at (${bestMove.r + 1}, ${bestMove.c + 1}).`;
  renderBoard();
  updateStatus();
}

function checkGameOver() {
  if (passStreak < 2) return;

  let blackStones = 0;
  let whiteStones = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === BLACK) blackStones += 1;
      if (cell === WHITE) whiteStones += 1;
    }
  }

  const blackScore = blackStones + captures.black;
  const whiteScore = whiteStones + captures.white;
  const result = blackScore === whiteScore ? 'Draw game!' : blackScore > whiteScore ? 'You win!' : 'AI wins!';

  messageElement.textContent = `Game over after two passes. Score — You: ${blackScore}, AI: ${whiteScore}. ${result}`;
}

function handleCellClick(r, c) {
  if (currentPlayer !== BLACK) return;

  const trial = applyMove(board, r, c, BLACK, previousBoardSignature);
  if (!trial.legal) {
    messageElement.textContent = 'Illegal move (occupied, suicide, or ko).';
    return;
  }

  previousBoardSignature = boardSignature(board);
  board = trial.nextState;
  captures.black += trial.captured;
  passStreak = 0;
  currentPlayer = WHITE;
  messageElement.textContent = `You played at (${r + 1}, ${c + 1}).`;
  renderBoard();
  updateStatus();

  setTimeout(() => {
    aiPlay();
    renderBoard();
    updateStatus();
  }, 250);
}

function updateStatus() {
  turnElement.textContent = `Turn: ${currentPlayer === BLACK ? 'Black (You)' : 'White (AI)'}`;
  capturesElement.textContent = `Captures — You: ${captures.black} | AI: ${captures.white}`;
}

function renderBoard() {
  boardElement.style.setProperty('--size', String(size));
  boardElement.innerHTML = '';

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const cell = document.createElement('button');
      cell.className = 'intersection';
      cell.type = 'button';
      cell.setAttribute('aria-label', `row ${r + 1}, col ${c + 1}`);
      const spacing = size > 1 ? 100 / (size - 1) : 0;
      cell.style.top = `${r * spacing}%`;
      cell.style.left = `${c * spacing}%`;

      const value = board[r][c];
      if (value !== EMPTY) {
        const stone = document.createElement('span');
        stone.className = `stone ${value === BLACK ? 'black' : 'white'}`;
        cell.appendChild(stone);
      }

      cell.addEventListener('click', () => handleCellClick(r, c));
      boardElement.appendChild(cell);
    }
  }
}

function resetGame() {
  const requested = Number.parseInt(sizeInput.value, 10);
  size = Number.isNaN(requested) ? 5 : Math.max(5, Math.min(13, requested));
  sizeInput.value = String(size);
  board = createBoard(size);
  currentPlayer = BLACK;
  captures = { black: 0, white: 0 };
  passStreak = 0;
  previousBoardSignature = '';
  messageElement.textContent = 'New game started.';
  renderBoard();
  updateStatus();
}

newGameButton.addEventListener('click', resetGame);
passButton.addEventListener('click', () => {
  passStreak += 1;
  if (currentPlayer === BLACK) {
    currentPlayer = WHITE;
    messageElement.textContent = 'You passed.';
    updateStatus();
    checkGameOver();
    if (passStreak < 2) {
      setTimeout(() => {
        aiPlay();
        renderBoard();
        updateStatus();
      }, 200);
    }
    return;
  }
  aiPlay();
});

resetGame();
