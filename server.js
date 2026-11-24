const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Локальний масив робіт домену (Варіант 2: Портфоліо фотографа/дизайнера)
const works = [
    {
        id: 1,
        title: 'Атмосферний студійний портрет',
        category: 'Портретна зйомка',
        imageUrl: 'assets/img/project1.jpg',
        description: 'Серія портретів із м’яким студійним освітленням та природною кольорокорекцією.'
    },
    {
        id: 2,
        title: 'Мінімалістичний брендинг кав’ярні',
        category: 'Айдентика та брендинг',
        imageUrl: 'assets/img/project2.jpg',
        description: 'Розробка логотипу, палітри кольорів та пакування для локальної кав’ярні.'
    },
    {
        id: 3,
        title: 'Вечірній міський репортаж',
        category: 'Репортаж',
        imageUrl: 'assets/img/project3.jpg',
        description: 'Документальна зйомка вечірніх вулиць Києва у жанрі стріт-фотографії.'
    },
    {
        id: 4,
        title: 'Постер для музичного фестивалю',
        category: 'Графічний дизайн',
        imageUrl: 'assets/img/project4.jpg',
        description: 'Типографічний плакат та серія афіш для літнього інді-фестивалю.'
    }
];

// Роздача статичних файлів клієнтської частини (HTML, CSS, JS, зображення)
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/works — повертає весь масив робіт у форматі JSON
app.get('/api/works', (req, res) => {
    res.status(200).json(works);
});

// GET /api/works/:id — повертає одну роботу за id або статус 404
app.get('/api/works/:id', (req, res) => {
    const work = works.find((item) => String(item.id) === req.params.id);

    if (!work) {
        return res.status(404).json({
            error: `Роботу з id=${req.params.id} не знайдено`
        });
    }

    res.status(200).json(work);
});

app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});