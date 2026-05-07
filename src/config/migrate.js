require('dotenv').config();
const { pool } = require('./database');

const migrations = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    avatar      VARCHAR(500) DEFAULT NULL,
    bio         TEXT         DEFAULT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'reader'
                             CHECK (role IN ('reader', 'author', 'admin')),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS genres (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(100) UNIQUE NOT NULL,
    slug  VARCHAR(120) UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS novels (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    slug          VARCHAR(300) UNIQUE NOT NULL,
    synopsis      TEXT         NOT NULL,
    cover_image   VARCHAR(500) DEFAULT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ongoing'
                               CHECK (status IN ('ongoing', 'completed', 'hiatus')),
    is_published  BOOLEAN      NOT NULL DEFAULT FALSE,
    view_count    INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS novel_genres (
    novel_id  UUID    NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    genre_id  INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (novel_id, genre_id)
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id        UUID        NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number  INTEGER     NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT        NOT NULL,
    word_count      INTEGER     NOT NULL DEFAULT 0,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (novel_id, chapter_number)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id  UUID        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    parent_id   UUID        DEFAULT NULL REFERENCES comments(id) ON DELETE SET NULL,
    content     TEXT        NOT NULL,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id    UUID        NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    score       SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
    review      TEXT        DEFAULT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (novel_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    novel_id   UUID        NOT NULL REFERENCES novels(id)  ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, novel_id)
  );

  CREATE TABLE IF NOT EXISTS reading_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    novel_id        UUID        NOT NULL REFERENCES novels(id)    ON DELETE CASCADE,
    last_chapter_id UUID        NOT NULL REFERENCES chapters(id)  ON DELETE CASCADE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, novel_id)
  );

  CREATE INDEX IF NOT EXISTS idx_novels_author     ON novels(author_id);
  CREATE INDEX IF NOT EXISTS idx_novels_status     ON novels(status);
  CREATE INDEX IF NOT EXISTS idx_novels_published  ON novels(is_published);
  CREATE INDEX IF NOT EXISTS idx_chapters_novel    ON chapters(novel_id);
  CREATE INDEX IF NOT EXISTS idx_comments_chapter  ON comments(chapter_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_novel     ON ratings(novel_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_user    ON bookmarks(user_id);
  CREATE INDEX IF NOT EXISTS idx_progress_user     ON reading_progress(user_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');
    await client.query(migrations);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
