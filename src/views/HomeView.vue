<script setup>
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { themes, currentTheme, setTheme } = useTheme()
const showThemeSelector = ref(false)

const games = [
  {
    id: '2048',
    title: '2048 Variants',
    description: '클래식 2048을 3종 모드(4×4, 3×3, 5×5)로 즐길 수 있어요.',
    badges: ['2048', '스와이프 지원', '모드 선택'],
    to: '/games/2048'
  },
  {
    id: 'pixel-runner',
    title: 'Pixel Runner',
    description: '끝없이 달리는 픽셀 러너 게임! 장애물을 피해 최대한 멀리 달려보세요.',
    badges: ['러너', '점프', '슬라이드'],
    to: '/games/pixel-runner'
  },
  {
    id: 'reaction-speed',
    title: 'Reaction Speed',
    description: '화면이 초록색으로 바뀌면 빠르게 클릭하세요! 반응속도를 측정하는 게임입니다.',
    badges: ['반응속도', '클릭', '측정'],
    to: '/games/reaction-speed'
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    description: '각 행, 열, 3×3 박스에 1부터 9까지 숫자를 한 번씩만 넣어 완성하세요.',
    badges: ['퍼즐', '논리', '난이도 선택'],
    to: '/games/sudoku'
  }
]
</script>

<template>
  <main class="home-shell">
    <header class="home-hero">
      <div class="theme-selector-wrapper">
        <button @click="showThemeSelector = !showThemeSelector" class="theme-toggle-btn">
          🎨 테마
        </button>
        <div v-if="showThemeSelector" class="theme-selector-dropdown">
          <div class="theme-list">
            <button
              v-for="theme in Object.values(themes)"
              :key="theme.id"
              @click="setTheme(theme.id); showThemeSelector = false"
              class="theme-option"
              :class="{ active: currentTheme === theme.id }"
            >
              <span class="theme-name">{{ theme.name }}</span>
              <span class="theme-desc">{{ theme.description }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <h1>Simple Games Hub</h1>
      <p class="lead">
        짧은 시간에 즐길 수 있는 미니 게임을 한 곳에 모았습니다. 원하는 게임을 선택하면 해당 페이지로 이동합니다.
      </p>
    </header>

    <section class="home-section">
      <div class="section-header">
        <h2>게임 선택</h2>
        <span>계속 업데이트될 예정입니다.</span>
      </div>

      <div class="game-grid">
        <RouterLink
          v-for="game in games"
          :key="game.id"
          :to="game.disabled ? undefined : game.to"
          class="game-card"
          :class="{ disabled: game.disabled }"
          tabindex="0"
        >
          <div class="game-card__body">
            <p class="game-label">Game</p>
            <h3>{{ game.title }}</h3>
            <p>{{ game.description }}</p>
          </div>
          <div class="badge-row">
            <span v-for="badge in game.badges" :key="badge" class="badge">{{ badge }}</span>
          </div>
          <div class="card-footer">
            <span v-if="game.disabled" class="soon">Coming Soon</span>
            <span v-else class="start">Play Now →</span>
          </div>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

