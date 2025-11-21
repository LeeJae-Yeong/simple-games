<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'

const STORAGE_KEY = 'simple-games/pixelRunnerBestScore'

const gameCanvas = ref(null)
const gameContext = ref(null)
const animationFrame = ref(null)
const isGameRunning = ref(false)
const isGameOver = ref(false)
const isPaused = ref(false)

const state = reactive({
  score: 0,
  bestScore: 0,
  speed: 3,
  groundY: 0,
  player: {
    x: 100,
    y: 0,
    width: 40,
    height: 50,
    velocityY: 0,
    isJumping: false,
    isSliding: false,
    slideHeight: 30
  },
  obstacles: [],
  clouds: [],
  lastObstacleTime: 0,
  lastCloudTime: 0
})

const GRAVITY = 0.8
const JUMP_POWER = -15
const GROUND_HEIGHT = 50
const OBSTACLE_SPAWN_INTERVAL = 2000
const CLOUD_SPAWN_INTERVAL = 3000
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400

function loadBestScore() {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(window.localStorage.getItem(STORAGE_KEY)) || 0
  } catch {
    return 0
  }
}

function saveBestScore() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, state.bestScore.toString())
}

function drawInitialScreen() {
  const ctx = gameContext.value
  if (!ctx) return
  
  // 화면 지우기
  ctx.fillStyle = '#87CEEB'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  // 땅 그리기
  drawGround(ctx)
  
  // 플레이어 그리기
  drawPlayer(ctx)
  
  // 점수 그리기
  drawScore(ctx)
}

function initGame() {
  const canvas = gameCanvas.value
  if (!canvas) return
  
  gameContext.value = canvas.getContext('2d')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  
  state.groundY = canvas.height - GROUND_HEIGHT
  state.player.y = state.groundY - state.player.height
  state.bestScore = loadBestScore()
  
  // 초기 화면 그리기
  drawInitialScreen()
}

function resetGame() {
  state.score = 0
  state.speed = 3
  state.player.x = 100
  state.player.y = state.groundY - state.player.height
  state.player.velocityY = 0
  state.player.isJumping = false
  state.player.isSliding = false
  state.obstacles = []
  state.clouds = []
  state.lastObstacleTime = Date.now()
  state.lastCloudTime = Date.now()
  isGameOver.value = false
  isPaused.value = false
}

function jump() {
  if (!isGameRunning.value || isGameOver.value || isPaused.value) return
  if (!state.player.isJumping && !state.player.isSliding) {
    state.player.velocityY = JUMP_POWER
    state.player.isJumping = true
    state.player.isSliding = false
  }
}

function slide() {
  if (!isGameRunning.value || isGameOver.value || isPaused.value) return
  if (!state.player.isJumping) {
    state.player.isSliding = true
  }
}

function stopSlide() {
  state.player.isSliding = false
}

function spawnObstacle() {
  const now = Date.now()
  if (now - state.lastObstacleTime > OBSTACLE_SPAWN_INTERVAL) {
    const types = ['cactus', 'bird']
    const type = types[Math.floor(Math.random() * types.length)]
    
    if (type === 'cactus') {
      state.obstacles.push({
        x: CANVAS_WIDTH,
        y: state.groundY - 60,
        width: 30,
        height: 60,
        type: 'cactus'
      })
    } else {
      state.obstacles.push({
        x: CANVAS_WIDTH,
        y: state.groundY - 100,
        width: 40,
        height: 30,
        type: 'bird'
      })
    }
    state.lastObstacleTime = now
  }
}

function spawnCloud() {
  const now = Date.now()
  if (now - state.lastCloudTime > CLOUD_SPAWN_INTERVAL) {
    state.clouds.push({
      x: CANVAS_WIDTH,
      y: Math.random() * 150 + 50,
      width: 60,
      height: 30
    })
    state.lastCloudTime = now
  }
}

function updatePlayer() {
  // 중력 적용
  if (state.player.isJumping) {
    state.player.velocityY += GRAVITY
    state.player.y += state.player.velocityY
    
    // 땅에 착지
    if (state.player.y >= state.groundY - state.player.height) {
      state.player.y = state.groundY - state.player.height
      state.player.velocityY = 0
      state.player.isJumping = false
    }
  }
}

function updateObstacles() {
  state.obstacles.forEach((obstacle) => {
    obstacle.x -= state.speed
  })
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0)
}

function updateClouds() {
  state.clouds.forEach((cloud) => {
    cloud.x -= state.speed * 0.5
  })
  state.clouds = state.clouds.filter((cloud) => cloud.x + cloud.width > 0)
}

function checkCollision() {
  const player = state.player
  const playerHeight = player.isSliding ? player.slideHeight : player.height
  const playerY = player.isSliding ? state.groundY - player.slideHeight : player.y
  
  for (const obstacle of state.obstacles) {
    if (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      playerY < obstacle.y + obstacle.height &&
      playerY + playerHeight > obstacle.y
    ) {
      return true
    }
  }
  return false
}

function drawGround(ctx) {
  // 땅 메인 색상
  ctx.fillStyle = '#8B7355'
  ctx.fillRect(0, state.groundY, CANVAS_WIDTH, GROUND_HEIGHT)
  
  // 땅 패턴 (움직이는 효과)
  const offset = (Date.now() / 10) % 40
  ctx.fillStyle = '#6B5B3D'
  for (let i = -40; i < CANVAS_WIDTH + 40; i += 40) {
    ctx.fillRect(i + offset, state.groundY, 20, 5)
  }
  
  // 땅 윤곽선
  ctx.strokeStyle = '#5A5A3A'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, state.groundY)
  ctx.lineTo(CANVAS_WIDTH, state.groundY)
  ctx.stroke()
  
  // 풀
  ctx.fillStyle = '#4A7C3A'
  for (let i = 0; i < CANVAS_WIDTH; i += 30) {
    const grassX = (i + offset) % CANVAS_WIDTH
    ctx.fillRect(grassX, state.groundY - 3, 2, 3)
    ctx.fillRect(grassX + 5, state.groundY - 4, 2, 4)
    ctx.fillRect(grassX + 10, state.groundY - 3, 2, 3)
  }
}

function drawPlayer(ctx) {
  const player = state.player
  const isSliding = player.isSliding
  const y = player.y
  const x = player.x
  
  if (isSliding) {
    // 슬라이드 상태: 납작하게 누운 모습
    // 몸통
    ctx.fillStyle = '#FF6B6B'
    ctx.fillRect(x + 5, y + 20, 30, 15)
    
    // 머리
    ctx.fillStyle = '#FFD93D'
    ctx.fillRect(x + 8, y + 15, 24, 20)
    
    // 눈
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(x + 12, y + 20, 6, 6)
    ctx.fillRect(x + 22, y + 20, 6, 6)
    
    // 눈동자
    ctx.fillStyle = '#000000'
    ctx.fillRect(x + 13, y + 21, 4, 4)
    ctx.fillRect(x + 23, y + 21, 4, 4)
    
    // 입
    ctx.fillStyle = '#000000'
    ctx.fillRect(x + 16, y + 28, 8, 2)
    
    // 팔 (앞으로 뻗음)
    ctx.fillStyle = '#FFD93D'
    ctx.fillRect(x + 35, y + 22, 8, 6)
    
    // 다리
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(x + 10, y + 35, 8, 8)
    ctx.fillRect(x + 22, y + 35, 8, 8)
  } else {
    // 일반 상태: 서 있는 모습
    // 머리
    ctx.fillStyle = '#FFD93D'
    ctx.fillRect(x + 8, y, 24, 24)
    
    // 머리 윤곽
    ctx.strokeStyle = '#E6C84F'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 8, y, 24, 24)
    
    // 눈
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(x + 12, y + 6, 6, 6)
    ctx.fillRect(x + 22, y + 6, 6, 6)
    
    // 눈동자
    ctx.fillStyle = '#000000'
    ctx.fillRect(x + 13, y + 7, 4, 4)
    ctx.fillRect(x + 23, y + 7, 4, 4)
    
    // 볼 (홍조)
    ctx.fillStyle = '#FFB6C1'
    ctx.fillRect(x + 10, y + 12, 3, 3)
    ctx.fillRect(x + 27, y + 12, 3, 3)
    
    // 입
    ctx.fillStyle = '#000000'
    ctx.fillRect(x + 16, y + 16, 8, 2)
    
    // 몸통
    ctx.fillStyle = '#FF6B6B'
    ctx.fillRect(x + 10, y + 24, 20, 18)
    
    // 몸통 윤곽
    ctx.strokeStyle = '#E55A5A'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 10, y + 24, 20, 18)
    
    // 팔 (달리는 모션)
    const armOffset = Math.sin(Date.now() / 100) * 2
    ctx.fillStyle = '#FFD93D'
    // 왼쪽 팔
    ctx.fillRect(x + 5, y + 26 + armOffset, 6, 12)
    // 오른쪽 팔
    ctx.fillRect(x + 29, y + 26 - armOffset, 6, 12)
    
    // 다리
    ctx.fillStyle = '#4ECDC4'
    const legOffset = Math.sin(Date.now() / 100 + Math.PI) * 2
    // 왼쪽 다리
    ctx.fillRect(x + 12, y + 42 + legOffset, 6, 8)
    // 오른쪽 다리
    ctx.fillRect(x + 22, y + 42 - legOffset, 6, 8)
    
    // 신발
    ctx.fillStyle = '#2C3E50'
    ctx.fillRect(x + 11, y + 50 + legOffset, 8, 4)
    ctx.fillRect(x + 21, y + 50 - legOffset, 8, 4)
  }
}

function drawObstacle(ctx, obstacle) {
  if (obstacle.type === 'cactus') {
    // 선인장 몸통
    ctx.fillStyle = '#2D5016'
    ctx.fillRect(obstacle.x + 8, obstacle.y, 14, obstacle.height)
    
    // 선인장 왼쪽 가지
    ctx.fillRect(obstacle.x, obstacle.y + 15, 10, 20)
    
    // 선인장 오른쪽 가지
    ctx.fillRect(obstacle.x + 20, obstacle.y + 20, 10, 15)
    
    // 가시
    ctx.fillStyle = '#1A3009'
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(obstacle.x + 10 + i * 4, obstacle.y + 5, 2, 8)
      ctx.fillRect(obstacle.x + 2, obstacle.y + 20 + i * 5, 2, 6)
      ctx.fillRect(obstacle.x + 22, obstacle.y + 25 + i * 4, 2, 6)
    }
    
    // 선인장 윤곽
    ctx.strokeStyle = '#1A3009'
    ctx.lineWidth = 1
    ctx.strokeRect(obstacle.x + 8, obstacle.y, 14, obstacle.height)
    ctx.strokeRect(obstacle.x, obstacle.y + 15, 10, 20)
    ctx.strokeRect(obstacle.x + 20, obstacle.y + 20, 10, 15)
  } else {
    // 새 몸통
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(obstacle.x + 5, obstacle.y + 5, 30, 20)
    
    // 새 머리
    ctx.fillStyle = '#654321'
    ctx.beginPath()
    ctx.arc(obstacle.x + 10, obstacle.y + 10, 8, 0, Math.PI * 2)
    ctx.fill()
    
    // 부리
    ctx.fillStyle = '#FFA500'
    ctx.fillRect(obstacle.x + 2, obstacle.y + 8, 6, 4)
    
    // 눈
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(obstacle.x + 8, obstacle.y + 7, 3, 3)
    ctx.fillStyle = '#000000'
    ctx.fillRect(obstacle.x + 9, obstacle.y + 8, 2, 2)
    
    // 날개 (애니메이션)
    const wingOffset = Math.sin(Date.now() / 150) * 3
    ctx.fillStyle = '#654321'
    ctx.fillRect(obstacle.x - 3, obstacle.y + 12 + wingOffset, 12, 8)
    ctx.fillRect(obstacle.x + 31, obstacle.y + 12 - wingOffset, 12, 8)
    
    // 꼬리
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(obstacle.x + 35, obstacle.y + 15, 5, 10)
  }
}

function drawCloud(ctx, cloud) {
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(cloud.x, cloud.y, cloud.width / 2, 0, Math.PI * 2)
  ctx.arc(cloud.x + cloud.width / 3, cloud.y, cloud.width / 2.5, 0, Math.PI * 2)
  ctx.arc(cloud.x + cloud.width / 1.5, cloud.y, cloud.width / 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawScore(ctx) {
  // 점수 배경
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(10, 10, 200, 70)
  
  // 점수 텍스트
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 20px monospace'
  ctx.fillText(`점수: ${Math.floor(state.score)}`, 20, 35)
  
  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 18px monospace'
  ctx.fillText(`최고: ${state.bestScore}`, 20, 60)
  
  // 테두리
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.strokeRect(10, 10, 200, 70)
}

function gameLoop() {
  if (!isGameRunning.value || isPaused.value) return
  
  const ctx = gameContext.value
  if (!ctx) return
  
  // 화면 지우기
  ctx.fillStyle = '#87CEEB'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  // 배경 그리기
  state.clouds.forEach((cloud) => drawCloud(ctx, cloud))
  
  // 땅 그리기
  drawGround(ctx)
  
  // 플레이어 업데이트 및 그리기
  updatePlayer()
  drawPlayer(ctx)
  
  // 장애물 업데이트 및 그리기
  spawnObstacle()
  updateObstacles()
  state.obstacles.forEach((obstacle) => drawObstacle(ctx, obstacle))
  
  // 구름 생성
  spawnCloud()
  updateClouds()
  
  // 점수 업데이트
  state.score += state.speed * 0.1
  state.speed += 0.001
  
  // 충돌 검사
  if (checkCollision()) {
    endGame()
    return
  }
  
  // 점수 그리기
  drawScore(ctx)
  
  animationFrame.value = requestAnimationFrame(gameLoop)
}

function startGame() {
  resetGame()
  isGameRunning.value = true
  isGameOver.value = false
  gameLoop()
}

function endGame() {
  isGameRunning.value = false
  isGameOver.value = true
  
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
  
  if (state.score > state.bestScore) {
    state.bestScore = Math.floor(state.score)
    saveBestScore()
  }
}

function togglePause() {
  if (!isGameRunning.value || isGameOver.value) return
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    gameLoop()
  }
}

function handleKeydown(event) {
  if (event.code === 'Space' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isGameRunning.value || isGameOver.value) {
      // 게임이 시작되지 않았거나 게임 오버 상태면 게임 시작
      startGame()
    } else {
      // 게임이 실행 중이면 점프
      jump()
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!isGameRunning.value) {
      // 게임이 시작되지 않았으면 게임 시작
      startGame()
    } else {
      // 게임이 실행 중이면 슬라이드
      slide()
    }
  } else if (event.key === 'p' || event.key === 'P') {
    event.preventDefault()
    togglePause()
  }
}

function handleKeyup(event) {
  if (event.key === 'ArrowDown') {
    stopSlide()
  }
}

onMounted(async () => {
  await nextTick()
  initGame()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
})

onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
})
</script>

<template>
  <main class="app-shell">
    <div class="nav-row">
      <RouterLink class="ghost-btn back-btn" to="/">← 게임 목록으로</RouterLink>
      <span class="nav-label">Pixel Runner</span>
    </div>

    <header class="hero">
      
      <h1>Pixel Runner</h1>
      <p class="lead">끝없이 달리는 픽셀 러너 게임! 장애물을 피해 최대한 멀리 달려보세요.</p>
    </header>

    <section class="game-surface">
      <div class="runner-container">
        <canvas ref="gameCanvas" class="game-canvas"></canvas>
        
        <div v-if="!isGameRunning && !isGameOver" class="start-screen">
          <h2>Pixel Runner</h2>
          <p>스페이스바 또는 ↑ 키로 시작</p>
          <p class="instructions">
            ↑ 또는 스페이스바: 점프<br>
            ↓: 슬라이드<br>
            P: 일시정지
          </p>
        </div>
        
        <div v-if="isGameOver" class="game-over-screen">
          <h2>게임 오버!</h2>
          <p>최종 점수: {{ Math.floor(state.score) }}</p>
          <p v-if="state.score > loadBestScore()" class="new-record">🎉 신기록 달성! 🎉</p>
          <button class="ghost-btn" @click="startGame">다시 시작</button>
        </div>
        
        <div v-if="isPaused" class="pause-screen">
          <h2>일시정지</h2>
          <p>P 키를 눌러 계속하기</p>
        </div>
      </div>
      
      <div class="controls-info">
        <p>조작법: ↑ 또는 스페이스바 (점프) | ↓ (슬라이드) | P (일시정지)</p>
      </div>
    </section>
  </main>
</template>

