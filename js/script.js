// Посилання на API для варіанта 2 (JSONPlaceholder Photos API)
const API_URL = 'https://jsonplaceholder.typicode.com/photos?albumId=1';

// Елементи DOM для роботи з інтерфейсом
const galleryContainer = document.querySelector('#gallery');
const counterElement = document.querySelector('#projects-count');
const loadingElement = document.querySelector('#loading-indicator');
const errorElement = document.querySelector('#error-message');
const refreshButton = document.querySelector('#refresh-btn');

// Масив робіт, що заповнюватиметься з зовнішнього API
let portfolioWorks = [];

// Функція перевірки "свіжості" картки (для ID <= 2)
const isRecent = id => id <= 2;

// Функція рендерингу отриманих даних з API у DOM (поля: title, thumbnailUrl, id)
function renderPortfolio(works) {
    galleryContainer.innerHTML = '';

    works.forEach(work => {
        const card = document.createElement('article');
        card.classList.add('card');

        if (isRecent(work.id)) {
            card.classList.add('recent');
        }

        const title = document.createElement('h3');
        title.textContent = work.title;

        const img = document.createElement('img');
        img.src = work.thumbnailUrl || 'https://via.placeholder.com/150';
        img.alt = work.title;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('card-content');

        const infoParagraph = document.createElement('p');
        infoParagraph.textContent = `ID фото: ${work.id} | Альбом №1`;
        infoParagraph.style.fontWeight = '500';

        contentDiv.append(infoParagraph);
        card.append(title, img, contentDiv);
        galleryContainer.append(card);
    });

    if (counterElement) {
        counterElement.textContent = `Усього робіт: ${works.length}`;
    }
}

// Функція керування відображенням стану завантаження (loading)
function showLoading(isLoading) {
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'block' : 'none';
    }
    if (refreshButton) {
        refreshButton.disabled = isLoading;
    }
}

// Функція відображення текстового повідомлення про помилку
function showError(message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = message ? 'block' : 'none';
    }
}

// Асинхронна функція завантаження даних через Fetch API з обробкою помилок
async function loadData() {
    showLoading(true);
    showError(''); // очищення попередніх повідомлень про помилки

    try {
        const response = await fetch(API_URL);

        // Перевірка коду статусу відповіді (response.ok)
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Альбом не знайдено');
            }
            throw new Error(`Сервер відповів кодом ${response.status}`);
        }

        // Розбір тіла відповіді як JSON
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Альбом не знайдено');
        }

        portfolioWorks = data;
        renderPortfolio(portfolioWorks);

    } catch (error) {
        console.error('Деталі помилки завантаження:', error);

        // Перевірка та обробка мережевих збоїв (режим Offline)
        if (!navigator.onLine || error.message.includes('Failed to fetch')) {
            showError('Не вдалося отримати дані: відсутнє мережеве з’єднання (Offline).');
        } else {
            showError(error.message || 'Не вдалося завантажити дані.');
        }
    } finally {
        showLoading(false);
    }
}

// Повторний виклик loadData() за кліком на кнопку «Оновити»
if (refreshButton) {
    refreshButton.addEventListener('click', () => {
        loadData();
    });
}

// Початковий виклик завантаження даних при відкритті сторінки
loadData();