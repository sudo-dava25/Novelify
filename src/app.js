require('dotenv').config();

const { pool } = require('./config/database');

async function autoMigrate() {
  const client = await pool.connect();
  try {
    console.log('Running auto-migrate...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500) DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'reader' CHECK (role IN ('reader','author','admin')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS genres (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(120) UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS novels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(300) UNIQUE NOT NULL,
        synopsis TEXT NOT NULL,
        cover_image VARCHAR(500) DEFAULT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing','completed','hiatus')),
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS novel_genres (
        novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (novel_id, genre_id)
      );
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        word_count INTEGER NOT NULL DEFAULT 0,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (novel_id, chapter_number)
      );
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id UUID DEFAULT NULL REFERENCES comments(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
        review TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (novel_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, novel_id)
      );
      CREATE TABLE IF NOT EXISTS reading_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        last_chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, novel_id)
      );
    `);
    const genres = [
      ['Fantasy','fantasy'],['Romance','romance'],['Action','action'],
      ['Mystery','mystery'],['Horror','horror'],['Sci-Fi','sci-fi'],
      ['Slice of Life','slice-of-life'],['Drama','drama'],
      ['Comedy','comedy'],['Thriller','thriller'],
      ['Isekai','isekai'],['BL','bl'],['GL','gl'],
    ];
    for (const [name, slug] of genres) {
      await client.query(
        `INSERT INTO genres (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
        [name, slug]
      );
    }
    console.log('Auto-migrate done.');
  } catch (err) {
    console.error('Auto-migrate failed:', err.message);
  } finally {
    client.release();
  }
}

autoMigrate();

const express        = require('express');
const session        = require('express-session');
const flash          = require('connect-flash');
const cookieParser   = require('cookie-parser');
const methodOverride = require('method-override');
const path           = require('path');
const fs             = require('fs');

const routes         = require('./routes');
const { injectUser } = require('./middlewares/auth');

const app  = express();
const ejsMate = require('ejs-mate');
app.engine('ejs', ejsMate);
const PORT = process.env.PORT || 3000;

const coversDir = path.join(__dirname, '../public/img/covers');
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev_secret_change_this',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));

app.use(flash());

app.use(injectUser);
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.flash('success'),
    error:   req.flash('error'),
  };
  next();
});

app.set('trust proxy', 1);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/', routes);

app.use((req, res) => {
  res.status(404).render('error', { title: '404', message: 'Page not found.' });
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    req.flash('error', `Maximum file size is ${process.env.UPLOAD_MAX_SIZE_MB || 5} MB.`);
    return res.redirect('back');
  }
  if (err.message && err.message.includes('Only')) {
    req.flash('error', err.message);
    return res.redirect('back');
  }
  console.error('[global error]', err);
  const status = err.status || 500;
  res.status(status).render('error', {
    title:   'An Error Occurred',
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
