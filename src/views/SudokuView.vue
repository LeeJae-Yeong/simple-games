<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const STORAGE_KEY = 'simple-games/sudokuBestTime'

const SIZE = 9
const BOX_SIZE = 3

const difficulties = [
  { id: 'easy', name: '쉬움', cellsToRemove: 35 },
  { id: 'medium', name: '보통', cellsToRemove: 45 },
  { id: 'hard', name: '어려움', cellsToRemove: 55 }
]

const selectedDifficulty = ref(difficulties[0])
const gameState = ref('menu') // menu, playing, solved
const startTime = ref(0)
const elapsedTime = ref(0)
const timerInterval = ref(null)
const selectedCell = ref(null)
const mistakes = ref(0)
const noteMode = ref(false)

const board = reactive(Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)))
const solution = reactive(Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)))
const initialBoard = reactive(Array(SIZE).fill(null).map(() => Array(SIZE).fill(false)))
const notes = reactive(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null).map(() => new Set())))

const bestTimes = reactive(loadBestTimes())

function loadBestTimes() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function saveBestTime(difficulty, time) {
  if (typeof window === 'undefined') return
  try {
    const times = loadBestTimes()
    const currentBest = times[difficulty.id]
    if (!currentBest || time < currentBest) {
      times[difficulty.id] = time
      bestTimes[difficulty.id] = time
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(times))
    }
  } catch {
    // ignore
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function isValid(board, row, col, num) {
  // 행 검사
  for (let x = 0; x < SIZE; x++) {
    if (board[row][x] === num) return false
  }
  
  // 열 검사
  for (let x = 0; x < SIZE; x++) {
    if (board[x][col] === num) return false
  }
  
  // 3x3 박스 검사
  const startRow = row - (row % BOX_SIZE)
  const startCol = col - (col % BOX_SIZE)
  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      if (board[i + startRow][j + startCol] === num) return false
    }
  }
  
  return true
}

function solveSudoku(board) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= SIZE; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num
            if (solveSudoku(board)) {
              return true
            }
            board[row][col] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

function generateCompleteBoard() {
  const newBoard = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0))
  
  // 대각선 3x3 박스를 먼저 채움 (독립적이므로)
  for (let box = 0; box < SIZE; box += BOX_SIZE) {
    fillBox(newBoard, box, box)
  }
  
  // 나머지 채우기
  solveSudoku(newBoard)
  
  return newBoard
}

function fillBox(board, row, col) {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  shuffle(nums)
  
  let idx = 0
  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      board[row + i][col + j] = nums[idx++]
    }
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

function removeCells(board, count) {
  const positions = []
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      positions.push([i, j])
    }
  }
  shuffle(positions)
  
  const removed = 0
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const [row, col] = positions[i]
    board[row][col] = 0
  }
}

function startNewGame() {
  // 완전한 보드 생성
  const completeBoard = generateCompleteBoard()
  
  // 해답 복사
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      solution[i][j] = completeBoard[i][j]
    }
  }
  
  // 셀 제거
  removeCells(completeBoard, selectedDifficulty.value.cellsToRemove)
  
  // 게임 보드 초기화
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      board[i][j] = completeBoard[i][j]
      initialBoard[i][j] = completeBoard[i][j] !== 0
      notes[i][j].clear()
    }
  }
  
  gameState.value = 'playing'
  startTime.value = Date.now()
  elapsedTime.value = 0
  mistakes.value = 0
  selectedCell.value = null
  noteMode.value = false
  
  startTimer()
}

function startTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  
  timerInterval.value = setInterval(() => {
    if (gameState.value === 'playing') {
      elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000)
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function selectCell(row, col) {
  if (gameState.value !== 'playing' || initialBoard[row][col]) return
  selectedCell.value = [row, col]
}

function setCellValue(num) {
  if (!selectedCell.value || gameState.value !== 'playing') return
  
  const [row, col] = selectedCell.value
  if (initialBoard[row][col]) return
  
  // 메모 모드일 때
  if (noteMode.value) {
    if (board[row][col] !== 0) return
    if (notes[row][col].has(num)) {
      notes[row][col].delete(num)
    } else {
      notes[row][col].add(num)
    }
    return
  }
  
  // 일반 입력 모드
  // 해답과 비교
  if (num === solution[row][col]) {
    board[row][col] = num
    notes[row][col].clear()
    checkWin()
  } else {
    mistakes.value++
    // 잘못된 입력은 표시하지 않음 (스도쿠 규칙)
  }
}

function toggleNoteMode() {
  noteMode.value = !noteMode.value
}

function clearCell() {
  if (!selectedCell.value || gameState.value !== 'playing') return
  
  const [row, col] = selectedCell.value
  if (initialBoard[row][col]) return
  
  board[row][col] = 0
  notes[row][col].clear()
}

function checkWin() {
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0 || board[i][j] !== solution[i][j]) {
        return false
      }
    }
  }
  
  gameState.value = 'solved'
  stopTimer()
  saveBestTime(selectedDifficulty.value, elapsedTime.value)
}

function getBoxNumber(row, col) {
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE)
}

function isCellInSameBox(row1, col1, row2, col2) {
  return getBoxNumber(row1, col1) === getBoxNumber(row2, col2)
}

function isCellInSameRow(row1, row2) {
  return row1 === row2
}

function isCellInSameCol(col1, col2) {
  return col1 === col2
}

const cellClass = computed(() => {
  return (row, col) => {
    const classes = ['cell']
    
    if (selectedCell.value && selectedCell.value[0] === row && selectedCell.value[1] === col) {
      classes.push('selected')
    } else if (selectedCell.value) {
      const [selRow, selCol] = selectedCell.value
      if (isCellInSameRow(row, selRow) || isCellInSameCol(col, selCol) || isCellInSameBox(row, col, selRow, selCol)) {
        classes.push('highlighted')
      }
    }
    
    if (initialBoard[row][col]) {
      classes.push('initial')
    }
    
    if ((row + 1) % BOX_SIZE === 0 && row < SIZE - 1) {
      classes.push('border-bottom')
    }
    
    if ((col + 1) % BOX_SIZE === 0 && col < SIZE - 1) {
      classes.push('border-right')
    }
    
    return classes.join(' ')
  }
})

function backToMenu() {
  stopTimer()
  gameState.value = 'menu'
  selectedCell.value = null
}

const currentBestTime = computed(() => {
  return bestTimes[selectedDifficulty.value.id] ? formatTime(bestTimes[selectedDifficulty.value.id]) : '-'
})

onMounted(() => {
  // 키보드 입력 처리
  const handleKeyPress = (e) => {
    if (gameState.value !== 'playing') return
    
    if (e.key >= '1' && e.key <= '9') {
      setCellValue(parseInt(e.key))
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      clearCell()
    } else if (e.key === 'ArrowUp' && selectedCell.value) {
      e.preventDefault()
      const [row, col] = selectedCell.value
      if (row > 0) selectCell(row - 1, col)
    } else if (e.key === 'ArrowDown' && selectedCell.value) {
      e.preventDefault()
      const [row, col] = selectedCell.value
      if (row < SIZE - 1) selectCell(row + 1, col)
    } else if (e.key === 'ArrowLeft' && selectedCell.value) {
      e.preventDefault()
      const [row, col] = selectedCell.value
      if (col > 0) selectCell(row, col - 1)
    } else if (e.key === 'ArrowRight' && selectedCell.value) {
      e.preventDefault()
      const [row, col] = selectedCell.value
      if (col < SIZE - 1) selectCell(row, col + 1)
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
    stopTimer()
  })
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="app-shell">
    <header class="hero">
      <button class="ghost-btn back-btn" @click="router.push('/')">← 홈으로</button>
      <p class="eyebrow">Sudoku Puzzle</p>
      <h1>스도쿠</h1>
      <p class="lead">
        각 행, 열, 3×3 박스에 1부터 9까지의 숫자가 한 번씩만 나타나도록 채워주세요.
      </p>
    </header>

    <div v-if="gameState === 'menu'" class="sudoku-menu">
      <div class="difficulty-selector">
        <h2>난이도 선택</h2>
        <div class="difficulty-buttons">
          <button
            v-for="diff in difficulties"
            :key="diff.id"
            @click="selectedDifficulty = diff"
            :class="['difficulty-btn', { active: selectedDifficulty.id === diff.id }]"
          >
            <span class="difficulty-name">{{ diff.name }}</span>
            <span class="difficulty-info">{{ diff.cellsToRemove }}개 제거</span>
            <span v-if="bestTimes[diff.id]" class="best-time">
              최고: {{ formatTime(bestTimes[diff.id]) }}
            </span>
          </button>
        </div>
      </div>
      
      <button @click="startNewGame" class="start-btn">게임 시작</button>
    </div>

    <div v-else class="sudoku-game">
      <div class="game-header">
        <div class="game-info">
          <div class="info-item">
            <span class="info-label">시간</span>
            <span class="info-value">{{ formatTime(elapsedTime) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">실수</span>
            <span class="info-value">{{ mistakes }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">최고 기록</span>
            <span class="info-value">{{ currentBestTime }}</span>
          </div>
        </div>
        <button @click="backToMenu" class="ghost-btn">메뉴로</button>
      </div>

      <div class="game-board-container">
        <div class="board-wrapper">
          <div class="action-buttons">
            <button @click="clearCell" class="action-btn">지우기</button>
            <button 
              @click="toggleNoteMode" 
              class="action-btn"
              :class="{ active: noteMode }"
            >
              {{ noteMode ? '메모 모드' : '일반 모드' }}
            </button>
          </div>
          <div class="sudoku-board">
            <div
              v-for="(row, rowIndex) in board"
              :key="rowIndex"
              class="board-row"
            >
              <div
                v-for="(cell, colIndex) in row"
                :key="colIndex"
                :class="cellClass(rowIndex, colIndex)"
                @click="selectCell(rowIndex, colIndex)"
              >
                <span v-if="cell !== 0" class="cell-value">{{ cell }}</span>
                <div v-else-if="notes[rowIndex][colIndex].size > 0" class="cell-notes">
                  <span
                    v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
                    :key="num"
                    :class="['note-number', { active: notes[rowIndex][colIndex].has(num) }]"
                  >
                    {{ notes[rowIndex][colIndex].has(num) ? num : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="game-controls">
          <div class="number-pad">
            <button
              v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
              :key="num"
              @click="setCellValue(num)"
              class="number-btn"
            >
              {{ num }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="gameState === 'solved'" class="win-overlay">
        <div class="win-modal">
          <h2>🎉 완료!</h2>
          <p class="win-time">소요 시간: {{ formatTime(elapsedTime) }}</p>
          <p class="win-mistakes">실수: {{ mistakes }}회</p>
          <div class="win-buttons">
            <button @click="startNewGame" class="start-btn">새 게임</button>
            <button @click="backToMenu" class="ghost-btn">메뉴로</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sudoku-menu {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.difficulty-selector {
  background: var(--theme-card-bg);
  border-radius: 24px;
  padding: 2rem;
  backdrop-filter: blur(16px);
  border: 1px solid var(--theme-card-border);
}

.difficulty-selector h2 {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  text-align: center;
}

.difficulty-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.difficulty-btn {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--theme-card-bg);
  border: 2px solid var(--theme-card-border);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.difficulty-btn:hover {
  background: var(--theme-button-ghost-hover);
  border-color: var(--theme-card-border);
}

.difficulty-btn.active {
  background: var(--theme-card-bg);
  border-color: var(--theme-primary);
}

.difficulty-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--theme-primary);
}

.difficulty-info {
  font-size: 0.9rem;
  opacity: 0.7;
}

.best-time {
  font-size: 0.85rem;
  opacity: 0.6;
  margin-top: 0.25rem;
}

.start-btn {
  font-size: 1.2rem;
  padding: 1.25rem 2.5rem;
  min-width: 200px;
  align-self: center;
}

.back-btn {
  align-self: flex-start;
  margin-bottom: 1rem;
}

.sudoku-game {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.game-board-container {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
}

.board-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--theme-card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(16px);
  border: 1px solid var(--theme-card-border);
}

.game-info {
  display: flex;
  gap: 2rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--theme-primary);
}

.sudoku-board {
  background: var(--theme-card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(16px);
  border: 1px solid var(--theme-card-border);
  display: inline-block;
}

.board-row {
  display: flex;
}

.cell {
  width: 50px;
  height: 50px;
  border: 1px solid var(--theme-card-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--theme-button-ghost);
  transition: all 0.15s ease;
  position: relative;
  font-size: 1.5rem;
  font-weight: 600;
}

.cell:hover {
  background: var(--theme-button-ghost-hover);
}

.cell.selected {
  background: var(--theme-card-bg);
  border-color: var(--theme-primary);
  z-index: 1;
}

.cell.highlighted {
  background: var(--theme-button-ghost);
}

.cell.initial {
  background: var(--theme-card-bg);
  color: var(--theme-text);
  font-weight: 700;
}

.cell.border-bottom {
  border-bottom: 3px solid var(--theme-card-border);
}

.cell.border-right {
  border-right: 3px solid var(--theme-card-border);
}

.cell-value {
  color: var(--theme-accent);
}

.cell.initial .cell-value {
  color: var(--theme-text);
}

.cell-notes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  padding: 2px;
  font-size: 0.65rem;
}

.note-number {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.note-number.active {
  opacity: 0.6;
  color: var(--theme-accent);
}

.game-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 200px;
}

.number-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.number-btn {
  aspect-ratio: 1;
  font-size: 1.5rem;
  font-weight: 700;
  padding: 1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  width: 100%;
}

.action-btn {
  flex: 1;
  max-width: 200px;
  padding: 1rem 2rem;
}

.action-btn.active {
  background: var(--theme-card-bg);
  border: 2px solid var(--theme-primary);
}

.win-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.win-modal {
  background: var(--theme-card-bg);
  border-radius: 24px;
  padding: 3rem;
  text-align: center;
  border: 2px solid var(--theme-primary);
  max-width: 400px;
  width: 90%;
}

.win-modal h2 {
  font-size: 2.5rem;
  margin: 0 0 1.5rem;
  color: var(--theme-primary);
}

.win-time {
  font-size: 1.5rem;
  margin: 0.5rem 0;
  color: var(--theme-text);
}

.win-mistakes {
  font-size: 1.1rem;
  margin: 0.5rem 0 2rem;
  opacity: 0.8;
}

.win-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 768px) {
  .cell {
    width: 35px;
    height: 35px;
    font-size: 1.2rem;
  }

  .cell-notes {
    font-size: 0.5rem;
  }

  .game-info {
    flex-direction: column;
    gap: 1rem;
  }

  .game-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>

