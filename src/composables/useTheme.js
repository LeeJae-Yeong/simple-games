import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'simple-games/theme'

const themes = {
  default: {
    id: 'default',
    name: '기본',
    description: '기본 보라색 테마',
    colors: {
      bg: 'radial-gradient(circle at top, #3c266e, #100b1f)',
      text: '#f8f6ff',
      textSecondary: 'rgba(248, 246, 255, 0.85)',
      primary: '#f0d775',
      primaryText: '#2a1a0f',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      buttonGhost: 'rgba(255, 255, 255, 0.12)',
      buttonGhostHover: 'rgba(255, 255, 255, 0.2)',
      accent: '#4a90e2'
    }
  },
  dark: {
    id: 'dark',
    name: '다크',
    description: '더 어두운 테마',
    colors: {
      bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      text: '#e0e0e0',
      textSecondary: 'rgba(224, 224, 224, 0.8)',
      primary: '#4a9eff',
      primaryText: '#ffffff',
      cardBg: 'rgba(255, 255, 255, 0.03)',
      cardBorder: 'rgba(255, 255, 255, 0.06)',
      buttonGhost: 'rgba(255, 255, 255, 0.08)',
      buttonGhostHover: 'rgba(255, 255, 255, 0.15)',
      accent: '#4a9eff'
    }
  },
  stealth: {
    id: 'stealth',
    name: '스텔스 모드',
    description: '회사에서 눈에 띄지 않는 어두운 테마',
    colors: {
      bg: '#0d1117',
      text: '#c9d1d9',
      textSecondary: 'rgba(201, 209, 217, 0.7)',
      primary: '#58a6ff',
      primaryText: '#0d1117',
      cardBg: 'rgba(22, 27, 34, 0.8)',
      cardBorder: 'rgba(48, 54, 61, 0.5)',
      buttonGhost: 'rgba(48, 54, 61, 0.6)',
      buttonGhostHover: 'rgba(48, 54, 61, 0.8)',
      accent: '#58a6ff'
    }
  },
  classic: {
    id: 'classic',
    name: '클래식',
    description: '밝고 깔끔한 테마',
    colors: {
      bg: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      text: '#2d3748',
      textSecondary: 'rgba(45, 55, 72, 0.8)',
      primary: '#4299e1',
      primaryText: '#ffffff',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(0, 0, 0, 0.1)',
      buttonGhost: 'rgba(0, 0, 0, 0.05)',
      buttonGhostHover: 'rgba(0, 0, 0, 0.1)',
      accent: '#4299e1'
    }
  },
  minimal: {
    id: 'minimal',
    name: '미니멀',
    description: '단순하고 깔끔한 테마',
    colors: {
      bg: '#ffffff',
      text: '#1a1a1a',
      textSecondary: 'rgba(26, 26, 26, 0.7)',
      primary: '#000000',
      primaryText: '#ffffff',
      cardBg: '#f8f8f8',
      cardBorder: '#e0e0e0',
      buttonGhost: 'rgba(0, 0, 0, 0.05)',
      buttonGhostHover: 'rgba(0, 0, 0, 0.1)',
      accent: '#000000'
    }
  },
  excel: {
    id: 'excel',
    name: '엑셀',
    description: '회사에서 자연스러운 엑셀 스타일 테마',
    colors: {
      bg: '#f8f9fa',
      text: '#000000',
      textSecondary: 'rgba(0, 0, 0, 0.7)',
      primary: '#217346',
      primaryText: '#ffffff',
      cardBg: '#ffffff',
      cardBorder: '#dadce0',
      buttonGhost: '#f1f3f4',
      buttonGhostHover: '#e8eaed',
      accent: '#0078d4'
    }
  }
}

const currentTheme = ref('default')

export function useTheme() {
  function loadTheme() {
    if (typeof window === 'undefined') return 'default'
    try {
      return window.localStorage.getItem(STORAGE_KEY) || 'default'
    } catch {
      return 'default'
    }
  }

  function saveTheme(themeId) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, themeId)
    } catch {
      // ignore
    }
  }

  function applyTheme(themeId) {
    if (typeof document === 'undefined') return
    const theme = themes[themeId] || themes.default
    const root = document.documentElement
    
    root.style.setProperty('--theme-bg', theme.colors.bg)
    root.style.setProperty('--theme-text', theme.colors.text)
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary)
    root.style.setProperty('--theme-primary', theme.colors.primary)
    root.style.setProperty('--theme-primary-text', theme.colors.primaryText)
    root.style.setProperty('--theme-card-bg', theme.colors.cardBg)
    root.style.setProperty('--theme-card-border', theme.colors.cardBorder)
    root.style.setProperty('--theme-button-ghost', theme.colors.buttonGhost)
    root.style.setProperty('--theme-button-ghost-hover', theme.colors.buttonGhostHover)
    root.style.setProperty('--theme-accent', theme.colors.accent)
    
    // 테마 데이터 속성 추가 (CSS 선택자용)
    root.setAttribute('data-theme', themeId)
    
    // body 배경색도 적용 (엑셀 테마는 CSS에서 처리)
    if (document.body && themeId !== 'excel') {
      document.body.style.background = theme.colors.bg
      document.body.style.backgroundImage = 'none'
    } else if (document.body && themeId === 'excel') {
      // 엑셀 테마는 CSS에서 그리드 패턴 처리
      document.body.style.background = ''
      document.body.style.backgroundImage = ''
    }
  }

  function setTheme(themeId) {
    if (!themes[themeId]) return
    currentTheme.value = themeId
    applyTheme(themeId)
    saveTheme(themeId)
  }

  // 초기화
  if (typeof window !== 'undefined') {
    const savedTheme = loadTheme()
    currentTheme.value = savedTheme
    applyTheme(savedTheme)
  }

  return {
    themes,
    currentTheme,
    setTheme,
    applyTheme,
    loadTheme
  }
}

