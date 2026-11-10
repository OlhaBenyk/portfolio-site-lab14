// ==========================================
// Практична робота №10: Клієнтське програмування з фреймворками (Vue 3)
// Обраний фреймворк: Vue 3 (глобальна CDN-збірка).
// Обґрунтування вибору: Vue 3 забезпечує зрозумілий та лаконічний синтаксис декларативного
// рендерингу, зручний компонентний підхід із реактивним станом (data) і не потребує
// налаштування складних інструментів збірки (Node.js/Vite/Babel).
// ==========================================

/*
  ==========================================================================
  [КРОК 7: ЗАКОМЕНТОВАНО РУЧНИЙ DOM-КОД З ПРАКТИКУМІВ 7, 8 ТА 9]
  Ручний рендер списку та створення вузлів через document.createElement/innerHTML
  закоментовано, оскільки відображення елементів та оновлення інтерфейсу тепер
  виконуються декларативно через реактивний компонент Vue 3 (PortfolioItem).
  ==========================================================================

  const API_URL = 'https://jsonplaceholder.typicode.com/photos?albumId=1';
  const galleryContainer = document.querySelector('#gallery');
  const counterElement = document.querySelector('#projects-count');
  ...
  function renderPortfolio(works) {
      galleryContainer.innerHTML = '';
      works.forEach(work => {
          const card = document.createElement('article');
          ...
      });
  }
*/

// Посилання на API для варіанта 2 (JSONPlaceholder Photos API)
const API_URL = 'https://jsonplaceholder.typicode.com/photos?albumId=1';

// Крок 4: Окремий компонент PortfolioItem (Варіант 2)
const PortfolioItem = {
    name: 'PortfolioItem',
    // Поля, що передаються через props
    props: {
        title: {
            type: String,
            required: true
        },
        year: {
            type: [Number, String],
            default: 2026
        },
        category: {
            type: String,
            default: 'Альбом №1'
        },
        thumbnailUrl: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        isRecent: {
            type: Boolean,
            default: false
        }
    },
    // Крок 6: Інтерактивна дія Варіанта 2 — локальний реактивний прапорець expanded
    data() {
        return {
            expanded: false
        };
    },
    methods: {
        toggleExpand() {
            this.expanded = !this.expanded;
        }
    },
    // Шаблон компонента (рендеринг та розгортання/згортання опису по кліку)
    template: `
        <article 
            class="card" 
            :class="{ recent: isRecent }"
            @click="toggleExpand" 
            style="cursor: pointer; user-select: none;"
        >
            <img :src="thumbnailUrl" :alt="title" />
            <div class="card-body">
                <h3 class="card-title" style="margin: 0 0 8px 0; font-size: 1.1rem;">{{ title }}</h3>
                <p class="card-meta">Рік: {{ year }} | {{ category }}</p>
                
                <!-- Розгортання / згортання опису роботи (v-if) -->
                <p v-if="expanded" class="card-description">
                    Опис: {{ description }}
                </p>
                <small style="color: var(--color-accent); font-weight: 600; margin-top: 10px; display: block;">
                    {{ expanded ? '▲ Згорнути опис' : '▼ Розгорнути опис' }}
                </small>
            </div>
        </article>
    `
};

// Створення екземпляра додатка Vue 3
const { createApp } = Vue;

createApp({
    components: {
        PortfolioItem
    },
    // Крок 3: Перенесення масиву об'єктів у реактивний стан data()
    data() {
        return {
            items: [],
            loading: false,
            errorMessage: ''
        };
    },
    methods: {
        // Отримання даних з API (з ЛР9) та оновлення реактивного стану Vue
        async loadData() {
            this.loading = true;
            this.errorMessage = '';
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Альбом не знайдено');
                    }
                    throw new Error(`Сервер відповів кодом ${response.status}`);
                }
                const data = await response.json();

                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('Альбом не знайдено');
                }

                // Vue 3 сам відстежує цю зміну й оновлює інтерфейс
                this.items = data;
            } catch (error) {
                console.error('Деталі помилки завантаження:', error);
                if (!navigator.onLine || error.message.includes('Failed to fetch')) {
                    this.errorMessage = 'Не вдалося отримати дані: відсутнє мережеве з’єднання (Offline).';
                } else {
                    this.errorMessage = error.message || 'Не вдалося завантажити дані.';
                }
            } finally {
                this.loading = false;
            }
        }
    },
    mounted() {
        // Завантаження даних при відкритті сторінки
        this.loadData();
    }
}).mount('#app');