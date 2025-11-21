<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'

const STORAGE_KEY = 'simple-games/bestScores'
const SWIPE_THRESHOLD = 30
const BOARD_GAP = 12

const gridRef = ref(null)
const boardVersion = ref(0)

const gameModes = [
  {
    id: 'classic',
    name: '클래식 2048',
    subtitle: '표준 4×4 보드',
    description: '가장 익숙한 규칙으로 천천히 점수를 쌓아보세요.',
    size: 4,
    target: 2048,
    features: ['2/4 타일 등장', '부드러운 난이도', '기본 승리 조건 2048'],
    spawn: [
      { value: 2, weight: 0.9 },
      { value: 4, weight: 0.1 }
    ]
  },
  {
    id: 'mini',
    name: '미니 1024',
    subtitle: '3×3 스피드 모드',
    description: '칸이 적어 전략적인 합치기가 필요합니다.',
    size: 3,
    target: 1024,
    features: ['빠른 한 판', '4 타일 등장 확률 증가', '콤보에 따른 점수 폭발'],
    spawn: [
      { value: 2, weight: 0.8 },
      { value: 4, weight: 0.2 }
    ]
  },
  {
    id: 'rush',
    name: '파워 러쉬',
    subtitle: '5×5 확장 보드',
    description: '큰 보드와 강력한 타일이 동시에 등장합니다.',
    size: 5,
    target: 4096,
    features: ['8/16 타일 낮은 확률 등장', '여유 있는 보드', '롱런 플레이'],
    spawn: [
      { value: 2, weight: 0.6 },
      { value: 4, weight: 0.25 },
      { value: 8, weight: 0.1 },
      { value: 16, weight: 0.05 }
    ]
  }
]

const bestScores = reactive(loadBestScores())
const currentMode = ref(gameModes[0])
const swipeStart = ref(null)
const state = reactive({
  grid: [],
  score: 0,
  lastAdded: null,
  mergedPositions: [],
  showWin: false,
  showGameOver: false,
  winAcknowledged: false
})

let isAnimating = false

const boardStyle = computed(() => ({
  gridTemplateColumns: `repeat(${currentMode.value.size}, 1fr)`,
  gridTemplateRows: `repeat(${currentMode.value.size}, 1fr)`
}))

const currentBestScore = computed(() => bestScores[currentMode.value.id] ?? 0)
const currentFeatures = computed(() => currentMode.value.features ?? [])

function loadBestScores() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function persistBestScores() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bestScores))
}

function updateBestScore() {
  const modeId = currentMode.value.id
  const best = bestScores[modeId] ?? 0
  if (state.score > best) {
    bestScores[modeId] = state.score
    persistBestScores()
  }
}

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function pickSpawnValue(options) {
  if (!options?.length) return 2
  const total = options.reduce((sum, item) => sum + (item.weight ?? 1), 0)
  let threshold = Math.random() * total
  for (const option of options) {
    threshold -= option.weight ?? 1
    if (threshold <= 0) return option.value
  }
  return options[0].value
}

function markBoardNeedsLayout() {
  boardVersion.value++
}

function calculateCellSize() {
  const container = gridRef.value
  if (!container) return 0
  // .board의 padding(12px)을 제외한 내부 너비 사용
  // .tile-layer는 inset: 12px로 이미 padding 영역에 위치
  const innerWidth = container.clientWidth - BOARD_GAP * 2
  return (innerWidth - (currentMode.value.size - 1) * BOARD_GAP) / currentMode.value.size
}

function tilePositionStyle(row, col) {
  // boardVersion.value를 참조하여 반응성 유지
  const _ = boardVersion.value
  const cellSize = calculateCellSize()
  if (cellSize === 0) {
    return { width: '0px', height: '0px', left: '0px', top: '0px' }
  }
  // .tile-layer는 inset: 12px로 이미 위치 조정됨
  // 따라서 0,0부터 시작하여 gap만큼 간격을 두고 배치
  const left = col * (cellSize + BOARD_GAP)
  const top = row * (cellSize + BOARD_GAP)
  return {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    left: `${left}px`,
    top: `${top}px`
  }
}

function addRandomTile() {
  const empties = []
  state.grid.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (!value) {
        empties.push({ row: rowIndex, col: colIndex })
      }
    })
  })
  if (!empties.length) {
    return false
  }
  const spot = empties[Math.floor(Math.random() * empties.length)]
  state.grid[spot.row][spot.col] = pickSpawnValue(currentMode.value.spawn)
  state.lastAdded = { ...spot, stamp: Date.now() }
  return true
}

function hasReachedTarget(grid) {
  return grid.some((row) => row.some((value) => value >= currentMode.value.target))
}

function isGameOver(grid) {
  const size = grid.length
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const value = grid[row][col]
      if (value === 0) return false
      if (col < size - 1 && value === grid[row][col + 1]) return false
      if (row < size - 1 && value === grid[row + 1][col]) return false
    }
  }
  return true
}

function areArraysEqual(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function moveLeft(grid) {
  const size = grid.length
  const newGrid = []
  const movements = []
  const merges = []
  let moved = false
  let scoreDelta = 0

  for (let rowIndex = 0; rowIndex < size; rowIndex++) {
    const row = grid[rowIndex]
    const tiles = []
    for (let colIndex = 0; colIndex < size; colIndex++) {
      if (row[colIndex] !== 0) {
        tiles.push({ value: row[colIndex], row: rowIndex, col: colIndex })
      }
    }

    const newRow = []
    let targetCol = 0

    for (let j = 0; j < tiles.length; j++) {
      const current = tiles[j]
      if (j < tiles.length - 1 && current.value === tiles[j + 1].value) {
        const next = tiles[j + 1]
        const mergedValue = current.value * 2
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: rowIndex, toCol: targetCol })
        movements.push({ fromRow: next.row, fromCol: next.col, toRow: rowIndex, toCol: targetCol })
        merges.push({ row: rowIndex, col: targetCol })
        scoreDelta += mergedValue
        newRow.push(mergedValue)
        j++
      } else {
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: rowIndex, toCol: targetCol })
        newRow.push(current.value)
      }
      targetCol++
    }

    while (newRow.length < size) {
      newRow.push(0)
    }

    if (!moved && !areArraysEqual(row, newRow)) {
      moved = true
    }

    newGrid.push(newRow)
  }

  return { moved, newGrid, movements, merges, scoreDelta }
}

function moveRight(grid) {
  const size = grid.length
  const newGrid = []
  const movements = []
  const merges = []
  let moved = false
  let scoreDelta = 0

  for (let rowIndex = 0; rowIndex < size; rowIndex++) {
    const row = grid[rowIndex]
    const tiles = []
    for (let colIndex = size - 1; colIndex >= 0; colIndex--) {
      if (row[colIndex] !== 0) {
        tiles.push({ value: row[colIndex], row: rowIndex, col: colIndex })
      }
    }

    const newRow = []
    let targetCol = size - 1

    for (let j = 0; j < tiles.length; j++) {
      const current = tiles[j]
      if (j < tiles.length - 1 && current.value === tiles[j + 1].value) {
        const next = tiles[j + 1]
        const mergedValue = current.value * 2
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: rowIndex, toCol: targetCol })
        movements.push({ fromRow: next.row, fromCol: next.col, toRow: rowIndex, toCol: targetCol })
        merges.push({ row: rowIndex, col: targetCol })
        scoreDelta += mergedValue
        newRow.unshift(mergedValue)
        j++
      } else {
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: rowIndex, toCol: targetCol })
        newRow.unshift(current.value)
      }
      targetCol--
    }

    while (newRow.length < size) {
      newRow.unshift(0)
    }

    if (!moved && !areArraysEqual(row, newRow)) {
      moved = true
    }

    newGrid.push(newRow)
  }

  return { moved, newGrid, movements, merges, scoreDelta }
}

function moveUp(grid) {
  const size = grid.length
  const newGrid = createEmptyGrid(size)
  const movements = []
  const merges = []
  let moved = false
  let scoreDelta = 0

  for (let colIndex = 0; colIndex < size; colIndex++) {
    const columnValues = grid.map((row) => row[colIndex])
    const tiles = []
    for (let rowIndex = 0; rowIndex < size; rowIndex++) {
      if (grid[rowIndex][colIndex] !== 0) {
        tiles.push({ value: grid[rowIndex][colIndex], row: rowIndex, col: colIndex })
      }
    }

    const newColumn = []
    let targetRow = 0

    for (let j = 0; j < tiles.length; j++) {
      const current = tiles[j]
      if (j < tiles.length - 1 && current.value === tiles[j + 1].value) {
        const next = tiles[j + 1]
        const mergedValue = current.value * 2
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: targetRow, toCol: colIndex })
        movements.push({ fromRow: next.row, fromCol: next.col, toRow: targetRow, toCol: colIndex })
        merges.push({ row: targetRow, col: colIndex })
        scoreDelta += mergedValue
        newColumn.push(mergedValue)
        j++
      } else {
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: targetRow, toCol: colIndex })
        newColumn.push(current.value)
      }
      targetRow++
    }

    while (newColumn.length < size) {
      newColumn.push(0)
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex++) {
      newGrid[rowIndex][colIndex] = newColumn[rowIndex]
    }

    if (!moved && !areArraysEqual(columnValues, newColumn)) {
      moved = true
    }
  }

  return { moved, newGrid, movements, merges, scoreDelta }
}

function moveDown(grid) {
  const size = grid.length
  const newGrid = createEmptyGrid(size)
  const movements = []
  const merges = []
  let moved = false
  let scoreDelta = 0

  for (let colIndex = 0; colIndex < size; colIndex++) {
    const columnValues = grid.map((row) => row[colIndex])
    const tiles = []
    for (let rowIndex = size - 1; rowIndex >= 0; rowIndex--) {
      if (grid[rowIndex][colIndex] !== 0) {
        tiles.push({ value: grid[rowIndex][colIndex], row: rowIndex, col: colIndex })
      }
    }

    const newColumn = []
    let targetRow = size - 1

    for (let j = 0; j < tiles.length; j++) {
      const current = tiles[j]
      if (j < tiles.length - 1 && current.value === tiles[j + 1].value) {
        const next = tiles[j + 1]
        const mergedValue = current.value * 2
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: targetRow, toCol: colIndex })
        movements.push({ fromRow: next.row, fromCol: next.col, toRow: targetRow, toCol: colIndex })
        merges.push({ row: targetRow, col: colIndex })
        scoreDelta += mergedValue
        newColumn.unshift(mergedValue)
        j++
      } else {
        movements.push({ fromRow: current.row, fromCol: current.col, toRow: targetRow, toCol: colIndex })
        newColumn.unshift(current.value)
      }
      targetRow--
    }

    while (newColumn.length < size) {
      newColumn.unshift(0)
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex++) {
      newGrid[rowIndex][colIndex] = newColumn[rowIndex]
    }

    if (!moved && !areArraysEqual(columnValues, newColumn)) {
      moved = true
    }
  }

  return { moved, newGrid, movements, merges, scoreDelta }
}

function animateMovements(movements) {
  return new Promise((resolve) => {
    if (!movements.length) {
      resolve()
      return
    }
    const container = gridRef.value
    if (!container) {
      resolve()
      return
    }
    
    // 애니메이션 전에 모든 타일 요소를 미리 찾아서 매핑
    const tileMap = new Map()
    const allTiles = container.querySelectorAll('.tile')
    allTiles.forEach((tile) => {
      const row = parseInt(tile.dataset.row)
      const col = parseInt(tile.dataset.col)
      const key = `${row},${col}`
      tileMap.set(key, tile)
    })
    
    const cellSize = calculateCellSize()
    const animatedTiles = []
    
    requestAnimationFrame(() => {
      movements.forEach((move) => {
        const key = `${move.fromRow},${move.fromCol}`
        const tile = tileMap.get(key)
        if (!tile) return
        
        // .tile-layer는 inset: 12px로 이미 위치 조정됨
        const left = move.toCol * (cellSize + BOARD_GAP)
        const top = move.toRow * (cellSize + BOARD_GAP)
        
        // 인라인 스타일로 위치 설정 (애니메이션)
        tile.style.left = `${left}px`
        tile.style.top = `${top}px`
        tile.dataset.row = move.toRow
        tile.dataset.col = move.toCol
        animatedTiles.push(tile)
      })
    })
    
    // 애니메이션 완료 후 인라인 스타일 제거
    setTimeout(() => {
      animatedTiles.forEach((tile) => {
        tile.style.left = ''
        tile.style.top = ''
      })
      resolve()
    }, 190)
  })
}

function tileLevelClass(value) {
  if (value <= 4096) {
    return `tile-${value}`
  }
  return 'tile-super'
}

function tileClasses(row, col, value) {
  const classes = ['tile', tileLevelClass(value)]
  if (state.lastAdded && state.lastAdded.row === row && state.lastAdded.col === col) {
    classes.push('tile-new')
  }
  if (state.mergedPositions.some((pos) => pos.row === row && pos.col === col)) {
    classes.push('tile-merged')
  }
  return classes
}

function resetHighlights() {
  state.lastAdded = null
  state.mergedPositions = []
}

async function performMove(direction) {
  if (state.showWin || state.showGameOver || isAnimating) return

  let result
  switch (direction) {
    case 'left':
      result = moveLeft(state.grid)
      break
    case 'right':
      result = moveRight(state.grid)
      break
    case 'up':
      result = moveUp(state.grid)
      break
    case 'down':
      result = moveDown(state.grid)
      break
    default:
      return
  }

  if (!result?.moved) return

  isAnimating = true
  state.mergedPositions = result.merges
  
  // 애니메이션을 먼저 실행 (현재 그리드 상태에서)
  await animateMovements(result.movements)
  
  // 애니메이션 완료 후 그리드 업데이트
  state.grid = result.newGrid
  state.score += result.scoreDelta
  await nextTick()
  
  // 새로운 타일 추가
  addRandomTile()
  updateBestScore()
  await nextTick()
  markBoardNeedsLayout()

  if (!state.winAcknowledged && hasReachedTarget(state.grid)) {
    state.winAcknowledged = true
    state.showWin = true
  }

  if (!state.showWin && isGameOver(state.grid)) {
    state.showGameOver = true
  }

  setTimeout(resetHighlights, 220)
  isAnimating = false
}

async function newGame(mode = currentMode.value) {
  if (mode && mode.id !== currentMode.value.id) {
    currentMode.value = mode
  }
  state.grid = createEmptyGrid(currentMode.value.size)
  state.score = 0
  state.lastAdded = null
  state.mergedPositions = []
  state.showWin = false
  state.showGameOver = false
  state.winAcknowledged = false
  addRandomTile()
  addRandomTile()
  await nextTick()
  markBoardNeedsLayout()
}

function handleModeChange(modeId) {
  const target = gameModes.find((mode) => mode.id === modeId)
  if (!target) return
  newGame(target)
}

function continueAfterWin() {
  state.showWin = false
}

const KEYBOARD_MAP = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
  h: 'left',
  l: 'right',
  k: 'up',
  j: 'down'
}

function handleKeydown(event) {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  const direction = KEYBOARD_MAP[key]
  if (!direction) return
  event.preventDefault()
  performMove(direction)
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  swipeStart.value = { x: event.clientX, y: event.clientY }
}

function onPointerUp(event) {
  if (!swipeStart.value) return
  const dx = event.clientX - swipeStart.value.x
  const dy = event.clientY - swipeStart.value.y
  swipeStart.value = null
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return
  const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
  performMove(direction)
}

function cancelSwipe() {
  swipeStart.value = null
}

onMounted(async () => {
  newGame()
  await nextTick()
  markBoardNeedsLayout()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', markBoardNeedsLayout)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', markBoardNeedsLayout)
})
</script>

<template>
  <main class="app-shell">
    <div class="nav-row">
      <RouterLink class="ghost-btn back-btn" to="/">← 게임 목록으로</RouterLink>
      <span class="nav-label">2048 Variants</span>
    </div>

    <header class="hero">
      
      <h1>Simple Games Hub</h1>
      <p class="lead">
        2048 규칙을 변형한 여러 보드를 한자리에서 즐겨보세요. 모드를 바꿔 다양한 난이도로 연습할 수 있습니다.
      </p>
    </header>

    <section class="mode-selector">
      <div class="section-header">
        <h2>게임 모드</h2>
        <span>{{ currentMode.subtitle }}</span>
      </div>
      <div class="mode-list">
        <button
          v-for="mode in gameModes"
          :key="mode.id"
          class="mode-card"
          :class="{ active: currentMode.id === mode.id }"
          @click="handleModeChange(mode.id)"
        >
          <div class="mode-card__header">
            <p class="mode-meta">{{ mode.size }}×{{ mode.size }} · 목표 {{ mode.target.toLocaleString() }}</p>
            <span class="badge" v-if="currentMode.id === mode.id">선택됨</span>
          </div>
          <h3>{{ mode.name }}</h3>
          <p>{{ mode.description }}</p>
        </button>
      </div>
    </section>

    <section class="game-surface">
      <div class="score-panel">
        <div class="score-box">
          <p>현재 점수</p>
          <strong>{{ state.score.toLocaleString() }}</strong>
        </div>
        <div class="score-box">
          <p>최고 점수</p>
          <strong>{{ currentBestScore.toLocaleString() }}</strong>
        </div>
        <div class="score-box">
          <p>목표 타일</p>
          <strong>{{ currentMode.target.toLocaleString() }}</strong>
        </div>
        <button class="ghost-btn" type="button" @click="newGame()">새 게임</button>
      </div>

      <div class="board-wrapper">
        <div
          class="board"
          ref="gridRef"
          @pointerdown="onPointerDown"
          @pointerup="onPointerUp"
          @pointerleave="cancelSwipe"
          @pointercancel="cancelSwipe"
        >
          <div class="board-background" :style="boardStyle">
            <template v-for="(row, rowIndex) in state.grid" :key="`bg-${rowIndex}`">
              <div v-for="(_, colIndex) in row" :key="`cell-${rowIndex}-${colIndex}`" class="board-cell" />
            </template>
          </div>

          <div class="tile-layer">
            <template v-for="(row, rowIndex) in state.grid" :key="`tiles-${rowIndex}`">
              <template v-for="(cell, colIndex) in row" :key="`tile-${rowIndex}-${colIndex}`">
                <span
                  v-if="cell"
                  :class="tileClasses(rowIndex, colIndex, cell)"
                  :data-row="rowIndex"
                  :data-col="colIndex"
                  :style="tilePositionStyle(rowIndex, colIndex)"
                >
                  {{ cell }}
                </span>
              </template>
            </template>
          </div>

          <div v-if="state.showWin" class="overlay win">
            <p>축하합니다!</p>
            <h3>{{ currentMode.target.toLocaleString() }} 타일 달성</h3>
            <div class="overlay-actions">
              <button type="button" @click="continueAfterWin">계속하기</button>
              <button type="button" class="ghost-btn" @click="newGame()">새 게임</button>
            </div>
          </div>

          <div v-if="state.showGameOver" class="overlay lose">
            <h3>게임 오버</h3>
            <p>더 이상 이동할 수 없어요.</p>
            <button type="button" @click="newGame()">다시 도전</button>
          </div>
        </div>
        <p class="helper-text">방향키·WASD로 이동하거나 터치/드래그로 스와이프하세요.</p>
      </div>
    </section>

    <section class="mode-details">
      <h2>{{ currentMode.name }} 공략 힌트</h2>
      <ul class="features-list">
        <li v-for="feature in currentFeatures" :key="feature">{{ feature }}</li>
      </ul>
      <p class="footnote">
        각 모드는 독립적인 최고 점수를 저장합니다. <span class="mono">localStorage</span> 를 사용하므로 브라우저를
        새로 열어도 기록이 유지됩니다.
      </p>
    </section>
  </main>
</template>


