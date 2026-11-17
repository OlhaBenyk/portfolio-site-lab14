// ============================================================================
// Практична робота №11: Локальні сховища даних (localStorage / IndexedDB)
// Варіант 2: Портфоліо фотографа/дизайнера
// Сховище: object store "works", keyPath: "id"
// ============================================================================

const LS_KEY = 'portfolio_works_ls';
const LS_MIGRATED_KEY = 'portfolio_works_migrated';
const DB_NAME = 'PortfolioDB';
const DB_VERSION = 1;
const STORE_NAME = 'works';

// Стартові дані для демонстрації первинного збереження в localStorage та подальшої міграції в IndexedDB
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
const statusElement = document.querySelector('#db-status');
const workForm = document.querySelector('#work-form');

// Допоміжна функція виведення статусних повідомлень або помилок БД
function showStatus(message, isError = false) {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.style.display = message ? 'block' : 'none';
    statusElement.style.backgroundColor = isError ? '#fdf2f2' : 'rgba(197, 155, 39, 0.12)';
    statusElement.style.color = isError ? '#9b1c1c' : '#181818';
    statusElement.style.border = isError ? '1px solid #f8b4b4' : '1px solid #c59b27';
}

// ============================================================================
// ЧАСТИНА 1: Синхронне збереження в localStorage (Кроки 2-3)
// ============================================================================

/**
 * Зберігає масив робіт у localStorage у форматі JSON-рядка
 */
function saveToLocalStorage(items) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Помилка запису в localStorage:', error);
    }
}

/**
 * Зчитує масив робіт із localStorage з безпечним розбором JSON у try/catch
 */
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

// ============================================================================
// ЧАСТИНА 2: Асинхронна робота з IndexedDB (Кроки 5-8)
// ============================================================================

/**
 * Відкриває або створює базу даних IndexedDB та об'єктне сховище "works" із ключем "id"
 */
function openDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('Ваш браузер не підтримує IndexedDB або ви перебуваєте в режимі приватного перегляду.'));
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
        request.onerror = () => reject(request.error || new Error('Не вдалося відкрити базу даних IndexedDB.'));
    });
}

/**
 * Додає новий запис або оновлює наявний у сховищі "works" (CRUD: Create / Update)
 */
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Отримує всі записи зі сховища "works" (CRUD: Read)
 */
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Видаляє запис зі сховища "works" за його унікальним id (CRUD: Delete)
 */
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Одноразова міграція даних із localStorage у IndexedDB при першому запуску
 */
async function migrateFromLocalStorageIfNeeded() {
    const isMigrated = localStorage.getItem(LS_MIGRATED_KEY) === 'true';
    const existingDbItems = await getAllItems();

    // Якщо сховище порожнє і міграція ще не проводилась
    if (existingDbItems.length === 0 && !isMigrated) {
        let lsItems = loadFromLocalStorage();

        // Якщо localStorage також порожній при першому запуску — ініціалізуємо початкові дані
        if (lsItems.length === 0) {
            lsItems = INITIAL_WORKS;
            saveToLocalStorage(lsItems);
        }

        // Переносимо кожен елемент із localStorage в IndexedDB
        for (const item of lsItems) {
            await addItem(item);
        }

        // Позначаємо прапорцем, щоб не дублювати міграцію при наступних перезавантаженнях
        localStorage.setItem(LS_MIGRATED_KEY, 'true');
        showStatus('Виконано одноразову міграцію стартових даних із localStorage в IndexedDB.');
    }
}

// ============================================================================
// ЧАСТИНА 3: Рендер списку та обробка дій користувача (Крок 9)
// ============================================================================

/**
 * Відмальовує список карток робіт, отриманих із IndexedDB
 */
function renderWorks(works) {
    galleryContainer.innerHTML = '';

    works.forEach(work => {
        const card = document.createElement('article');
        card.className = 'card';

        const img = document.createElement('img');
        img.src = work.imageUrl || 'https://picsum.photos/seed/default/600/400';
        img.alt = work.title;

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

        // Кнопка видалення роботи (CRUD: Delete)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Видалити роботу';
        deleteBtn.style.cssText = 'background: #fdf2f2; color: #9b1c1c; border: 1px solid #f8b4b4; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500;';

        deleteBtn.addEventListener('click', async () => {
            try {
                await deleteItem(work.id);
                const updatedWorks = await getAllItems();
                saveToLocalStorage(updatedWorks); // підтримуємо актуальну копію в LS
                renderWorks(updatedWorks);
                showStatus(`Роботу «${work.title}» видалено з IndexedDB.`);
            } catch (error) {
                showStatus('Помилка під час видалення запису з IndexedDB.', true);
            }
        });

        content.append(categoryBadge, desc, deleteBtn);
        card.append(img, title, content);
        galleryContainer.appendChild(card);
    });

    if (counterElement) {
        counterElement.textContent = `Усього робіт: ${works.length}`;
    }
}

// Обробка відправлення форми додавання нової роботи (CRUD: Create)
if (workForm) {
    workForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const titleInput = document.querySelector('#work-title');
        const categoryInput = document.querySelector('#work-category');
        const imageInput = document.querySelector('#work-image');
        const descInput = document.querySelector('#work-desc');

        const newWork = {
            id: Date.now(), // унікальний числовий ідентифікатор
            title: titleInput.value.trim(),
            category: categoryInput.value,
            imageUrl: imageInput.value.trim() || `https://picsum.photos/seed/${Date.now()}/600/400`,
            description: descInput.value.trim()
        };

        try {
            // Зберігаємо в IndexedDB
            await addItem(newWork);

            // Отримуємо оновлений список із IndexedDB та перемальовуємо інтерфейс
            const updatedWorks = await getAllItems();
            saveToLocalStorage(updatedWorks);
            renderWorks(updatedWorks);

            workForm.reset();
            showStatus(`Нову роботу «${newWork.title}» успішно збережено в IndexedDB!`);
        } catch (error) {
            console.error('Помилка збереження в IndexedDB:', error);
            showStatus('Не вдалося зберегти роботу в базу даних IndexedDB.', true);
        }
    });
}

// Ініціалізація застосунку при завантаженні сторінки (Крок 11: try/catch навколо openDB)
async function initApp() {
    try {
        await openDB();
        await migrateFromLocalStorageIfNeeded();
        const works = await getAllItems();
        renderWorks(works);
    } catch (error) {
        console.error('Критична помилка IndexedDB:', error);
        showStatus(`Помилка доступу до локальної бази даних: ${error.message}`, true);
        // Резервне завантаження з localStorage, якщо IndexedDB заблокована
        const fallbackWorks = loadFromLocalStorage();
        renderWorks(fallbackWorks);
    }
}

initApp();