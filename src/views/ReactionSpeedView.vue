<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const STORAGE_KEY = 'simple-games/reactionSpeedBestTime'

const gameState = ref('waiting') // waiting, ready, go, clicked, result, finished
const round = ref(0)
const startTime = ref(0)
const reactionTime = ref(0)
const roundTimes = ref([])
const averageTime = ref(0)
const bestTime = ref(0)
const timeoutId = ref(null)

const TOTAL_ROUNDS = 5

const state = reactive({
  message: '게임을 시작하려면 클릭하세요',
  backgroundColor: '#1a1a2e'
})

function loadBestTime() {
  if (typeof window === 'undefined') return Infinity
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? parseFloat(saved) : Infinity
  } catch {
    return Infinity
  }
}

function saveBestTime(time) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, time.toString())
  } catch {
    // ignore
  }
}

function startGame() {
  round.value = 0
  roundTimes.value = []
  gameState.value = 'ready'
  state.message = '준비하세요...'
  state.backgroundColor = '#1a1a2e'
  
  nextRound()
}

function nextRound() {
  if (round.value >= TOTAL_ROUNDS) {
    finishGame()
    return
  }

  round.value++
  gameState.value = 'waiting'
  state.message = '대기 중...'
  state.backgroundColor = '#1a1a2e'

  // 랜덤 시간 후 Go 신호 (1초 ~ 4초 사이)
  const randomDelay = 1000 + Math.random() * 3000
  
  timeoutId.value = setTimeout(() => {
    if (gameState.value === 'waiting') {
      gameState.value = 'go'
      state.message = '지금 클릭!'
      state.backgroundColor = '#00ff88'
      startTime.value = performance.now()
    }
  }, randomDelay)
}

function handleClick() {
  if (gameState.value === 'waiting' || gameState.value === 'ready') {
    // 너무 빨리 클릭한 경우 (페널티)
    if (timeoutId.value) {
      clearTimeout(timeoutId.value)
      timeoutId.value = null
    }
    gameState.value = 'clicked'
    state.message = '너무 빨랐어요! 기다리세요.'
    state.backgroundColor = '#ff4444'
    
    setTimeout(() => {
      if (gameState.value === 'clicked') {
        nextRound()
      }
    }, 1500)
    return
  }

  if (gameState.value === 'go') {
    reactionTime.value = performance.now() - startTime.value
    roundTimes.value.push(reactionTime.value)
    
    gameState.value = 'result'
    state.message = `${reactionTime.value.toFixed(0)}ms`
    state.backgroundColor = '#4a90e2'
    
    setTimeout(() => {
      if (gameState.value === 'result') {
        nextRound()
      }
    }, 1500)
  }
}

function finishGame() {
  gameState.value = 'finished'
  
  // 평균 반응속도 계산
  averageTime.value = roundTimes.value.reduce((a, b) => a + b, 0) / roundTimes.value.length
  
  // 최고 기록 업데이트
  const currentBest = loadBestTime()
  if (averageTime.value < currentBest) {
    bestTime.value = averageTime.value
    saveBestTime(averageTime.value)
  } else {
    bestTime.value = currentBest
  }
  
  state.message = '게임 완료!'
  state.backgroundColor = '#1a1a2e'
}

function resetGame() {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value)
    timeoutId.value = null
  }
  gameState.value = 'waiting'
  round.value = 0
  roundTimes.value = []
  state.message = '게임을 시작하려면 클릭하세요'
  state.backgroundColor = '#1a1a2e'
}

onMounted(() => {
  bestTime.value = loadBestTime()
})

onUnmounted(() => {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value)
  }
})
</script>

<template>
  <div class="app-shell">
    <header class="hero">
      <button class="ghost-btn back-btn" @click="router.push('/')">← 홈으로</button>
      <p class="eyebrow">Reaction Speed Test</p>
      <h1>반응속도 게임</h1>
      <p class="lead">
        화면이 초록색으로 바뀌면 빠르게 클릭하세요! 5라운드의 평균 반응속도를 측정합니다.
      </p>
    </header>

    <div class="reaction-game-container">
      <div class="game-stats">
        <div class="stat-item">
          <span class="stat-label">라운드</span>
          <span class="stat-value">{{ round }} / {{ TOTAL_ROUNDS }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">평균 반응속도</span>
          <span class="stat-value">
            {{ averageTime > 0 ? averageTime.toFixed(0) + 'ms' : '-' }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">최고 기록</span>
          <span class="stat-value">
            {{ bestTime !== Infinity ? bestTime.toFixed(0) + 'ms' : '-' }}
          </span>
        </div>
      </div>

      <div
        class="reaction-area"
        :style="{ backgroundColor: state.backgroundColor }"
        @click="handleClick"
      >
        <div class="reaction-message">{{ state.message }}</div>
        <div v-if="gameState === 'result'" class="reaction-time">
          {{ reactionTime.toFixed(0) }}ms
        </div>
        <div v-if="gameState === 'finished'" class="final-results">
          <h2>게임 완료!</h2>
          <div class="result-details">
            <div class="result-item">
              <span>평균 반응속도</span>
              <span class="result-value">{{ averageTime.toFixed(0) }}ms</span>
            </div>
            <div v-if="roundTimes.length > 0" class="round-times">
              <p>라운드별 기록:</p>
              <div class="times-list">
                <span
                  v-for="(time, index) in roundTimes"
                  :key="index"
                  class="time-badge"
                >
                  {{ (index + 1) }}R: {{ time.toFixed(0) }}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="game-controls">
        <button
          v-if="gameState === 'waiting' && round === 0"
          @click="startGame"
          class="start-btn"
        >
          게임 시작
        </button>
        <button
          v-if="gameState === 'finished'"
          @click="resetGame"
          class="start-btn"
        >
          다시 하기
        </button>
      </div>

      <div class="game-instructions">
        <h3>게임 방법</h3>
        <ul>
          <li>화면이 초록색으로 바뀌면 즉시 클릭하세요</li>
          <li>너무 빨리 클릭하면 페널티가 있습니다</li>
          <li>5라운드의 평균 반응속도를 측정합니다</li>
          <li>최고 기록은 자동으로 저장됩니다</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reaction-game-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.game-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: center;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f0d775;
}

.reaction-area {
  aspect-ratio: 16 / 9;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  user-select: none;
  min-height: 400px;
}

.reaction-area:active {
  transform: scale(0.98);
}

.reaction-message {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  text-align: center;
  color: #f8f6ff;
  z-index: 1;
}

.reaction-time {
  position: absolute;
  top: 2rem;
  font-size: 3rem;
  font-weight: 800;
  color: #f0d775;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.final-results {
  text-align: center;
  padding: 2rem;
  z-index: 1;
}

.final-results h2 {
  font-size: 2.5rem;
  margin: 0 0 2rem;
  color: #f0d775;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 1.25rem;
  opacity: 0.8;
}

.result-value {
  font-size: 3rem;
  font-weight: 800;
  color: #f0d775;
  margin-top: 0.5rem;
}

.round-times {
  margin-top: 1rem;
}

.round-times p {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  opacity: 0.7;
}

.times-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.time-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.start-btn {
  font-size: 1.1rem;
  padding: 1rem 2.5rem;
  min-width: 200px;
}

.back-btn {
  align-self: flex-start;
  margin-bottom: 1rem;
}

.game-instructions {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.game-instructions h3 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  color: #f0d775;
}

.game-instructions ul {
  margin: 0;
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: 0.85;
}

.game-instructions li {
  line-height: 1.6;
}

@media (max-width: 768px) {
  .reaction-area {
    min-height: 300px;
  }

  .game-stats {
    grid-template-columns: 1fr;
  }

  .times-list {
    flex-direction: column;
    align-items: center;
  }
}
</style>

