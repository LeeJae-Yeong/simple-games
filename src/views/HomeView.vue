<script setup>
const games = [
  {
    id: '2048',
    title: '2048 Variants',
    description: '클래식 2048을 3종 모드(4×4, 3×3, 5×5)로 즐길 수 있어요.',
    badges: ['2048', '스와이프 지원', '모드 선택'],
    to: '/games/2048'
  },
  {
    id: 'coming-1',
    title: 'Pixel Runner',
    description: '간단한 러너 게임이 준비 중입니다.',
    badges: ['준비 중'],
    disabled: true
  },
  {
    id: 'coming-2',
    title: 'Match-3 Puzzle',
    description: '블록을 맞추어 점수를 노리는 퍼즐 게임 (예정).',
    badges: ['준비 중'],
    disabled: true
  }
]
</script>

<template>
  <main class="home-shell">
    <header class="home-hero">
      <p class="eyebrow">Vue 3 Mini Arcade</p>
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

