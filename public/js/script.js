// ============================================================================
// Практична робота №14: Node.js, клієнт-серверна взаємодія, власний API
// Варіант 2: Портфоліо фотографа/дизайнера (Express API + SPA + IndexedDB)
// ============================================================================

const API_BASE_URL = '/api/works';
const LS_KEY = 'portfolio_works_ls';
const DB_NAME = 'PortfolioDB';
const DB_VERSION = 1;
const STORE_NAME = 'works';
const TARGET_WORKS_COUNT = 6; // цільова кількість робіт для розрахунку прогрес-бару

function showStatus(message, isError = false) {
    const statusElement = document.querySelector('#db-status');
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.style.display = message ? 'block' : 'none';
    statusElement.style.backgroundColor = isError ? '#fdf2f2' : 'rgba(197, 155, 39, 0.12)';
    statusElement.style.color = isError ? '#9b1c1c' : '#181818';
    statusElement.style.border = isError ? '1px solid #f8b4b4' : '1px solid #c59b27';
}

// ============================================================================
// Запити до власного локального сервера Node.js (/api/works та /api/works/:id)
// ============================================================================

async function fetchWorksFromApi() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`Помилка сервера: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Помилка отримання списку робіт з /api/works:', error);
        throw error;
    }
}

async function fetchWorkByIdFromApi(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`);
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`Помилка сервера: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Помилка отримання роботи id=${id} з /api/works/:id:`, error);
        return null;
    }
}

// ============================================================================
// Робота з localStorage та IndexedDB (кешування та локальні записи)
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
        tx.objectStore(STORE_NAME).delete(Number(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function syncWithServerApi() {
    const serverWorks = await fetchWorksFromApi();
    for (const item of serverWorks) {
        await addItem(item);
    }
    const allWorks = await getAllItems();
    saveToLocalStorage(allWorks);
    return allWorks;
}

// ============================================================================
// Повторно використовувані функції рендеру карток та прогрес-бару
// ============================================================================

function updatePortfolioProgress(count) {
    const percent = Math.min(100, Math.round((count / TARGET_WORKS_COUNT) * 100));
    const counterElement = document.querySelector('#projects-count');
    const progressLabelElement = document.querySelector('#progress-label');
    const progressFillElement = document.querySelector('#portfolio-progress-fill');

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

function renderWorks(works, container = document.querySelector('#gallery')) {
    if (!container) return;
    container.innerHTML = '';

    if (works.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.style.cssText = 'grid-column: 1 / -1; padding: 32px; text-align: center; background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: 8px;';
        emptyBox.innerHTML = `
            <p style="margin: 0 0 12px; color: var(--color-text-muted);">У цій категорії поки що немає робіт.</p>
            <a href="#/" data-link class="btn-secondary" style="display: inline-block; text-decoration: none;">Повернутися до всіх робіт</a>
        `;
        container.appendChild(emptyBox);
        return;
    }

    works.forEach((work, index) => {
        const card = document.createElement('article');
        card.className = 'card animate-enter';
        card.style.animationDelay = `${index * 0.09}s`;

        const imgLink = document.createElement('a');
        imgLink.href = `#/works/${work.id}`;
        imgLink.setAttribute('data-link', '');
        imgLink.className = 'card-img-wrapper';

        const img = document.createElement('img');
        img.src = work.imageUrl || 'https://picsum.photos/seed/default/600/400';
        img.alt = work.title;
        imgLink.appendChild(img);

        const title = document.createElement('h3');
        const titleLink = document.createElement('a');
        titleLink.href = `#/works/${work.id}`;
        titleLink.setAttribute('data-link', '');
        titleLink.style.cssText = 'text-decoration: none; color: inherit;';
        titleLink.textContent = work.title;
        title.appendChild(titleLink);

        const content = document.createElement('div');
        content.className = 'card-content';

        const categoryLine = document.createElement('p');
        categoryLine.style.marginBottom = '6px';
        const categoryLink = document.createElement('a');
        categoryLink.href = `#/category/${encodeURIComponent(work.category)}`;
        categoryLink.setAttribute('data-link', '');
        categoryLink.style.cssText = 'font-weight: 600; color: var(--color-accent); text-decoration: none;';
        categoryLink.textContent = `Категорія: ${work.category}`;
        categoryLine.appendChild(categoryLink);

        const desc = document.createElement('p');
        desc.textContent = work.description;
        desc.style.marginBottom = '14px';

        const actionsRow = document.createElement('div');
        actionsRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

        const detailLink = document.createElement('a');
        detailLink.href = `#/works/${work.id}`;
        detailLink.setAttribute('data-link', '');
        detailLink.className = 'btn-secondary';
        detailLink.style.cssText = 'text-decoration: none; padding: 6px 12px; font-size: 0.85rem;';
        detailLink.textContent = 'Детальніше';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Видалити роботу';
        deleteBtn.style.cssText = 'background: #fdf2f2; color: #9b1c1c; border: 1px solid #f8b4b4; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500;';

        deleteBtn.addEventListener('click', async () => {
            try {
                card.classList.remove('animate-enter');
                card.classList.add('animate-exit');

                await new Promise(resolve => setTimeout(resolve, 280));
                await deleteItem(work.id);

                const updatedWorks = await getAllItems();
                saveToLocalStorage(updatedWorks);
                await router();
                showStatus(`Роботу «${work.title}» видалено з локального сховища.`);
            } catch (error) {
                showStatus('Помилка під час видалення запису.', true);
            }
        });

        actionsRow.append(detailLink, deleteBtn);
        content.append(categoryLine, desc, actionsRow);
        card.append(imgLink, title, content);
        container.appendChild(card);
    });
}

// ============================================================================
// View-функції маршрутів SPA ("/", "/works/:id", "/category/:category", 404)
// ============================================================================

async function renderHomeView() {
    const app = document.querySelector('#app');
    const isPaused = document.body.classList.contains('animations-paused');

    app.innerHTML = `
        <section id="about">
            <h2>Про мене</h2>
            <p>Вітаю! Я фотограф та графічний дизайнер. Створюю візуальний контент, атмосферні портретні зйомки та розробляю сучасні дизайн-концепти.</p>
        </section>

        <section id="works">
            <h2>Мої роботи (Node.js API + SPA та IndexedDB)</h2>

            <div id="db-status" style="display: none; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-weight: 500;"></div>

            <div class="portfolio-progress-box">
                <div class="portfolio-progress-header">
                    <span id="projects-count">Усього робіт: 0</span>
                    <span id="progress-label">Ціль колекції: 0 / ${TARGET_WORKS_COUNT} робіт (0%)</span>
                </div>
                <div class="portfolio-progress-track">
                    <div id="portfolio-progress-fill" class="portfolio-progress-fill"></div>
                </div>
            </div>

            <div class="animation-controls">
                <button type="button" id="reload-api-btn" class="btn-secondary">Оновити з сервера (/api/works)</button>
                <button type="button" id="replay-anim-btn" class="btn-secondary">Відтворити появу карток</button>
                <button type="button" id="toggle-anim-btn" class="btn-secondary">${isPaused ? 'Увімкнути анімації (Play)' : 'Вимкнути анімації (Pause)'}</button>
            </div>

            <div id="gallery" class="cards"></div>

            <div id="add-work" class="form-container">
                <h3>Додати нову роботу до портфоліо</h3>
                <form id="work-form">
                    <div class="form-group">
                        <label for="work-title">Назва проєкту *</label>
                        <input type="text" id="work-title" required placeholder="Наприклад: Осіння фотосесія">
                    </div>

                    <div class="form-group">
                        <label for="work-category">Категорія *</label>
                        <select id="work-category" required>
                            <option value="Портретна зйомка">Портретна зйомка</option>
                            <option value="Графічний дизайн">Графічний дизайн</option>
                            <option value="Айдентика та брендинг">Айдентика та брендинг</option>
                            <option value="Репортаж">Репортаж</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="work-image">Посилання на зображення (URL)</label>
                        <input type="url" id="work-image" placeholder="https://picsum.photos/seed/photo1/600/400">
                    </div>

                    <div class="form-group">
                        <label for="work-desc">Опис роботи *</label>
                        <input type="text" id="work-desc" required placeholder="Короткий опис ідеї та реалізації">
                    </div>

                    <button type="submit" class="btn-submit">Зберегти в IndexedDB</button>
                </form>
            </div>
        </section>

        <aside>
            <h2>Мої навички</h2>
            <ul>
                <li>Художня та репортажна фотографія</li>
                <li>Adobe Photoshop, Lightroom, Illustrator</li>
                <li>Розробка фірмового стилю та айдентики</li>
            </ul>
        </aside>
    `;

    const works = await loadWorksSafe();
    renderWorks(works, document.querySelector('#gallery'));
    updatePortfolioProgress(works.length);
    bindHomeControls();
}

async function renderWorkDetailView(params) {
    const app = document.querySelector('#app');

    // Спочатку пробуємо отримати роботу напряму з серверного ендпоінта GET /api/works/:id
    let work = await fetchWorkByIdFromApi(params.id);

    // Якщо її немає на сервері (наприклад, додана локально користувачем), шукаємо в локальному сховищі
    if (!work) {
        const works = await loadWorksSafe();
        work = works.find((item) => String(item.id) === String(params.id));
    }

    if (!work) {
        renderNotFoundView(`Роботу з ID «${params.id}» не знайдено (404).`);
        return;
    }

    app.innerHTML = '';

    const section = document.createElement('section');
    section.className = 'animate-enter';
    section.style.cssText = 'max-width: 860px; margin: 0 auto;';

    const topBar = document.createElement('div');
    topBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;';

    const backLink = document.createElement('a');
    backLink.href = '#/';
    backLink.setAttribute('data-link', '');
    backLink.className = 'btn-secondary';
    backLink.style.textDecoration = 'none';
    backLink.textContent = '← Назад до галереї';

    const catLink = document.createElement('a');
    catLink.href = `#/category/${encodeURIComponent(work.category)}`;
    catLink.setAttribute('data-link', '');
    catLink.style.cssText = 'font-weight: 600; color: var(--color-accent); text-decoration: none;';
    catLink.textContent = `Категорія: ${work.category}`;

    topBar.append(backLink, catLink);

    const card = document.createElement('article');
    card.style.cssText = 'background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;';

    const img = document.createElement('img');
    img.src = work.imageUrl || 'https://picsum.photos/seed/default/900/500';
    img.alt = work.title;
    img.style.cssText = 'width: 100%; max-height: 480px; object-fit: cover;';

    const body = document.createElement('div');
    body.style.padding = '24px';

    const meta = document.createElement('p');
    meta.style.cssText = 'font-size: 0.85rem; color: var(--color-text-muted); margin: 0 0 8px;';
    meta.textContent = `ID проєкту: ${work.id} • ${work.category}`;

    const title = document.createElement('h2');
    title.style.marginTop = '0';
    title.textContent = work.title;

    const desc = document.createElement('p');
    desc.style.cssText = 'font-size: 1.05rem; line-height: 1.7; color: var(--color-text-main); margin-bottom: 24px;';
    desc.textContent = work.description;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Видалити роботу';
    deleteBtn.style.cssText = 'background: #fdf2f2; color: #9b1c1c; border: 1px solid #f8b4b4; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
    deleteBtn.addEventListener('click', async () => {
        await deleteItem(work.id);
        const updated = await getAllItems();
        saveToLocalStorage(updated);
        navigate('#/');
    });

    body.append(meta, title, desc, deleteBtn);
    card.append(img, body);
    section.append(topBar, card);
    app.appendChild(section);
}

async function renderCategoryView(params) {
    const app = document.querySelector('#app');
    const categoryName = decodeURIComponent(params.category);
    const allWorks = await loadWorksSafe();
    const filtered = allWorks.filter(
        (work) => work.category.toLowerCase() === categoryName.toLowerCase()
    );

    const categories = ['Портретна зйомка', 'Графічний дизайн', 'Айдентика та брендинг', 'Репортаж'];

    app.innerHTML = `
        <section>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                <h2 id="category-heading" style="margin: 0;"></h2>
                <a href="#/" data-link class="btn-secondary" style="text-decoration: none;">← Усі роботи (${allWorks.length})</a>
            </div>

            <div class="animation-controls" style="margin-bottom: 20px;">
                ${categories.map((cat) => {
        const active = cat.toLowerCase() === categoryName.toLowerCase();
        return `<a href="#/category/${encodeURIComponent(cat)}" data-link class="btn-secondary" style="text-decoration: none; ${active ? 'border-color: var(--color-accent); background-color: var(--color-accent-soft); font-weight: 600;' : ''}">${cat}</a>`;
    }).join('')}
            </div>

            <p style="color: var(--color-text-muted); margin-bottom: 20px;">Знайдено робіт: <strong>${filtered.length}</strong></p>

            <div id="gallery" class="cards"></div>
        </section>
    `;

    document.querySelector('#category-heading').textContent = `Категорія: ${categoryName}`;
    renderWorks(filtered, document.querySelector('#gallery'));
}

function renderNotFoundView(message = 'Сторінку не знайдено.') {
    const app = document.querySelector('#app');
    app.innerHTML = `
        <section class="animate-enter" style="text-align: center; padding: 60px 16px;">
            <h2 style="border: none; font-size: 3rem; color: var(--color-accent); margin-bottom: 12px;">404</h2>
            <p id="not-found-msg" style="color: var(--color-text-muted); font-size: 1.1rem; margin-bottom: 24px;"></p>
            <a href="#/" data-link class="btn-submit" style="text-decoration: none; display: inline-block;">Повернутися на головну</a>
        </section>
    `;
    document.querySelector('#not-found-msg').textContent = message;
}

// ============================================================================
// Таблиця маршрутів та клієнтський SPA-роутер (Hash-based routing)
// ============================================================================

const routes = [
    { path: '/', view: renderHomeView },
    { path: '/works/:id', view: renderWorkDetailView },
    { path: '/category/:category', view: renderCategoryView }
];

function matchRoute(path) {
    const pathParts = path.split('/').filter(Boolean);

    for (const route of routes) {
        const routeParts = route.path.split('/').filter(Boolean);
        if (routeParts.length !== pathParts.length) continue;

        const params = {};
        const isMatch = routeParts.every((part, i) => {
            if (part.startsWith(':')) {
                params[part.slice(1)] = pathParts[i];
                return true;
            }
            return part === pathParts[i];
        });

        if (isMatch) return { view: route.view, params };
    }

    return null;
}

function navigate(hashUrl) {
    if (location.hash === hashUrl) {
        router();
    } else {
        location.hash = hashUrl;
    }
}

async function router() {
    const path = location.hash.slice(1) || '/';
    const matched = matchRoute(path);

    if (matched) {
        await matched.view(matched.params);
    } else {
        renderNotFoundView(`Маршрут «${path}» не знайдено.`);
    }
}

// ============================================================================
// Прив'язка обробників форми та керування анімаціями на головній сторінці
// ============================================================================

function bindHomeControls() {
    const workForm = document.querySelector('#work-form');
    const reloadApiBtn = document.querySelector('#reload-api-btn');
    const replayAnimBtn = document.querySelector('#replay-anim-btn');
    const toggleAnimBtn = document.querySelector('#toggle-anim-btn');

    if (reloadApiBtn) {
        reloadApiBtn.addEventListener('click', async () => {
            try {
                const works = await syncWithServerApi();
                renderWorks(works, document.querySelector('#gallery'));
                updatePortfolioProgress(works.length);
                showStatus(`Дані успішно оновлено з локального сервера (${API_BASE_URL}).`);
            } catch (error) {
                showStatus(`Не вдалося звернутися до сервера: ${error.message}`, true);
            }
        });
    }

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
                renderWorks(updatedWorks, document.querySelector('#gallery'));
                updatePortfolioProgress(updatedWorks.length);

                workForm.reset();
                showStatus(`Роботу «${newWork.title}» додано до IndexedDB!`);
            } catch (error) {
                showStatus('Не вдалося зберегти роботу в IndexedDB.', true);
            }
        });
    }

    if (replayAnimBtn) {
        replayAnimBtn.addEventListener('click', () => {
            const cards = document.querySelectorAll('.card');
            cards.forEach((card, index) => {
                card.classList.remove('animate-enter');
                void card.offsetWidth;
                card.style.animationDelay = `${index * 0.09}s`;
                card.classList.add('animate-enter');
            });
        });
    }

    if (toggleAnimBtn) {
        toggleAnimBtn.addEventListener('click', () => {
            const isPaused = document.body.classList.toggle('animations-paused');
            toggleAnimBtn.textContent = isPaused
                ? 'Увімкнути анімації (Play)'
                : 'Вимкнути анімації (Pause)';
        });
    }
}

async function loadWorksSafe() {
    try {
        await openDB();
        return await syncWithServerApi();
    } catch (error) {
        showStatus(`Сервер недоступний, показано кешовані дані: ${error.message}`, true);
        try {
            const cachedDb = await getAllItems();
            return cachedDb.length ? cachedDb : loadFromLocalStorage();
        } catch {
            return loadFromLocalStorage();
        }
    }
}

document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-link]');
    if (!link) return;

    event.preventDefault();
    navigate(link.getAttribute('href'));
});

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) {
        history.replaceState(null, '', '#/');
    }
    router();
});