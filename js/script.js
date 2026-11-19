// ============================================================================
// Практична робота №12: CSS-анімації та інтерактивні елементи (Варіант 2)
// Інтеграція з локальним сховищем IndexedDB (Практикум №11)
// ============================================================================

const LS_KEY = 'portfolio_works_ls';
const LS_MIGRATED_KEY = 'portfolio_works_migrated';
const DB_NAME = 'PortfolioDB';
const DB_VERSION = 1;
const STORE_NAME = 'works';
const TARGET_WORKS_COUNT = 6; // цільова кількість робіт для розрахунку прогрес-бару

const INITIAL_WORKS = [
    {
        id: 1,
        title: 'Атмосферний студійний портрет',
        imageUrl: 'https://picsum.photos/seed/portrait1/600/400',
        category: 'Портретна зйомка',
        description: 'Гра світла і тіні в мінімалістичній студії.'
    },
    {
        id: 2,
        title: 'Айдентика для кав’ярні «Зерно»',
        imageUrl: 'https://picsum.photos/seed/design2/600/400',
        category: 'Айдентика та брендинг',
        description: 'Розробка логотипу, пакування та фірмової палітри.'
    },
    {
        id: 3,
        title: 'Карпатські світанки',
        imageUrl: 'https://picsum.photos/seed/nature3/600/400',
        category: 'Репортаж',
        description: 'Серія пейзажних знімків з експедиції в гори.'
    }
];

// Елементи DOM
const galleryContainer = document.querySelector('#gallery');
const counterElement = document.querySelector('#projects-count');
const progressLabelElement = document.querySelector('#progress-label');
const progressFillElement = document.querySelector('#portfolio-progress-fill');
const statusElement = document.querySelector('#db-status');
const workForm = document.querySelector('#work-form');
const replayAnimBtn = document.querySelector('#replay-anim-btn');
const toggleAnimBtn = document.querySelector('#toggle-anim-btn');

function showStatus(message, isError = false) {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.style.display = message ? 'block' : 'none';
    statusElement.style.backgroundColor = isError ? '#fdf2f2' : 'rgba(197, 155, 39, 0.12)';
    statusElement.style.color = isError ? '#9b1c1c' : '#181818';
    statusElement.style.border = isError ? '1px solid #f8b4b4' : '1px solid #c59b27';
}

// ============================================================================
// Робота з localStorage та IndexedDB (з Практикуму №11)
// ============================================================================

function saveToLocalStorage(items) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Помилка запису в localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('Ваш браузер не підтримує IndexedDB.'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Помилка відкриття IndexedDB.'));
    });
}

async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function migrateFromLocalStorageIfNeeded() {
    const isMigrated = localStorage.getItem(LS_MIGRATED_KEY) === 'true';
    const existingDbItems = await getAllItems();

    if (existingDbItems.length === 0 && !isMigrated) {
        let lsItems = loadFromLocalStorage();
        if (lsItems.length === 0) {
            lsItems = INITIAL_WORKS;
            saveToLocalStorage(lsItems);
        }
        for (const item of lsItems) {
            await addItem(item);
        }
        localStorage.setItem(LS_MIGRATED_KEY, 'true');
    }
}

// ============================================================================
// ЛР12: Оновлення анімованого прогрес-бару та рендер карток із CSS-анімацією
// ============================================================================

/**
 * Оновлює ширину прогрес-бару залежно від реальної кількості робіт у IndexedDB
 * (анімація ширини виконується через CSS transition)
 */
function updatePortfolioProgress(count) {
    const percent = Math.min(100, Math.round((count / TARGET_WORKS_COUNT) * 100));

    if (counterElement) {
        counterElement.textContent = `Усього робіт: ${count}`;
    }
    if (progressLabelElement) {
        progressLabelElement.textContent = `Ціль колекції: ${count} / ${TARGET_WORKS_COUNT} робіт (${percent}%)`;
    }
    if (progressFillElement) {
        progressFillElement.style.width = `${percent}%`;
    }
}

/**
 * Відмальовує картки робіт із каскадною CSS-анімацією появи (fade-in + translateY)
 * та обгорткою .card-img-wrapper для hover-ефекту масштабування (transform: scale)
 */
function renderWorks(works) {
    galleryContainer.innerHTML = '';

    works.forEach((work, index) => {
        const card = document.createElement('article');
        card.className = 'card animate-enter';
        // Каскадна затримка появи кожної наступної картки (по 90 мс)
        card.style.animationDelay = `${index * 0.09}s`;

        // Обгортка зображення для плавного transform: scale(1.06) при наведенні
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'card-img-wrapper';

        const img = document.createElement('img');
        img.src = work.imageUrl || 'https://picsum.photos/seed/default/600/400';
        img.alt = work.title;
        imgWrapper.appendChild(img);

        const title = document.createElement('h3');
        title.textContent = work.title;

        const content = document.createElement('div');
        content.className = 'card-content';

        const categoryBadge = document.createElement('p');
        categoryBadge.style.fontWeight = '600';
        categoryBadge.style.color = 'var(--color-accent)';
        categoryBadge.style.marginBottom = '6px';
        categoryBadge.textContent = `Категорія: ${work.category}`;

        const desc = document.createElement('p');
        desc.textContent = work.description;
        desc.style.marginBottom = '14px';

        // Кнопка видалення з плавною CSS-анімацією зникнення (.animate-exit)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Видалити роботу';
        deleteBtn.style.cssText = 'background: #fdf2f2; color: #9b1c1c; border: 1px solid #f8b4b4; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500;';

        deleteBtn.addEventListener('click', async () => {
            try {
                // Запускаємо CSS-анімацію зникнення перед видаленням із БД
                card.classList.remove('animate-enter');
                card.classList.add('animate-exit');

                await new Promise(resolve => setTimeout(resolve, 280));
                await deleteItem(work.id);

                const updatedWorks = await getAllItems();
                saveToLocalStorage(updatedWorks);
                renderWorks(updatedWorks);
                showStatus(`Роботу «${work.title}» видалено зі сховища.`);
            } catch (error) {
                showStatus('Помилка під час видалення запису.', true);
            }
        });

        content.append(categoryBadge, desc, deleteBtn);
        card.append(imgWrapper, title, content);
        galleryContainer.appendChild(card);
    });

    // Оновлюємо прогрес-індикатор відповідно до актуального стану даних
    updatePortfolioProgress(works.length);
}

// Додавання нової роботи через форму з анімацією появи нової картки
if (workForm) {
    workForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const titleInput = document.querySelector('#work-title');
        const categoryInput = document.querySelector('#work-category');
        const imageInput = document.querySelector('#work-image');
        const descInput = document.querySelector('#work-desc');

        const newWork = {
            id: Date.now(),
            title: titleInput.value.trim(),
            category: categoryInput.value,
            imageUrl: imageInput.value.trim() || `https://picsum.photos/seed/${Date.now()}/600/400`,
            description: descInput.value.trim()
        };

        try {
            await addItem(newWork);
            const updatedWorks = await getAllItems();
            saveToLocalStorage(updatedWorks);
            renderWorks(updatedWorks);

            workForm.reset();
            showStatus(`Роботу «${newWork.title}» додано та анімовано!`);
        } catch (error) {
            showStatus('Не вдалося зберегти роботу в IndexedDB.', true);
        }
    });
}

// Кнопка повторного програвання CSS-анімації появи карток
if (replayAnimBtn) {
    replayAnimBtn.addEventListener('click', () => {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.classList.remove('animate-enter');
            void card.offsetWidth; // примусовий reflow для перезапуску @keyframes
            card.style.animationDelay = `${index * 0.09}s`;
            card.classList.add('animate-enter');
        });
    });
}

// Кнопка призупинення / відновлення анімацій (Крок 8: animation-play-state)
if (toggleAnimBtn) {
    toggleAnimBtn.addEventListener('click', () => {
        const isPaused = document.body.classList.toggle('animations-paused');
        toggleAnimBtn.textContent = isPaused
            ? 'Увімкнути анімації (Play)'
            : 'Вимкнути анімації (Pause)';
    });
}

// Ініціалізація застосунку
async function initApp() {
    try {
        await openDB();
        await migrateFromLocalStorageIfNeeded();
        const works = await getAllItems();
        renderWorks(works);
    } catch (error) {
        showStatus(`Помилка доступу до БД: ${error.message}`, true);
        const fallbackWorks = loadFromLocalStorage();
        renderWorks(fallbackWorks);
    }
}

initApp();