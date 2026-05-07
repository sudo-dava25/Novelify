const { query }  = require('../config/database');
const slugify    = require('slugify');
const fs         = require('fs');
const path       = require('path');
const { validationResult } = require('express-validator');

const dashboard = async (req, res) => {
  try {
    const [novels, users, chapters, comments] = await Promise.all([
      query('SELECT COUNT(*) FROM novels'),
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM chapters'),
      query('SELECT COUNT(*) FROM comments WHERE is_deleted = FALSE'),
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {
        novels:   parseInt(novels.rows[0].count),
        users:    parseInt(users.rows[0].count),
        chapters: parseInt(chapters.rows[0].count),
        comments: parseInt(comments.rows[0].count),
      },
    });
  } catch (err) {
    console.error('[admin.dashboard]', err);
    res.render('error', { message: 'Failed to load dashboard.' });
  }
};

const listNovels = async (req, res) => {
  const novels = await query(`
    SELECT n.*, u.username AS author_name
    FROM novels n JOIN users u ON u.id = n.author_id
    ORDER BY n.created_at DESC
  `);
  res.render('admin/novels', { title: 'Manage Novels', novels: novels.rows });
};

const newNovel = async (req, res) => {
  const genres = await query('SELECT * FROM genres ORDER BY name');
  res.render('admin/novel-form', {
    title: 'Add Novel',
    novel: null,
    genres: genres.rows,
    errors: [],
    old: null,
  });
};

const createNovel = async (req, res) => {
  const errors = validationResult(req);
  const genres = await query('SELECT * FROM genres ORDER BY name');

  if (!errors.isEmpty()) {
    return res.render('admin/novel-form', {
      title: 'Add Novel',
      novel: null,
      genres: genres.rows,
      errors: errors.array(),
      old: req.body,
    });
  }

  const { title, synopsis, status, genre_ids, is_published } = req.body;
  const authorId = res.locals.currentUser.id;
  const cover    = req.file ? `/img/covers/${req.file.filename}` : null;

  let slug = slugify(title, { lower: true, strict: true });
  const existing = await query('SELECT id FROM novels WHERE slug = $1', [slug]);
  if (existing.rows.length) slug += `-${Date.now()}`;

  const client = await require('../config/database').pool.connect();
  try {
    await client.query('BEGIN');

    const novelRes = await client.query(`
      INSERT INTO novels (author_id, title, slug, synopsis, cover_image, status, is_published)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [authorId, title, slug, synopsis, cover, status, is_published === 'on']);

    const novelId   = novelRes.rows[0].id;
    const genreList = Array.isArray(genre_ids) ? genre_ids : (genre_ids ? [genre_ids] : []);

    for (const gid of genreList) {
      await client.query(
        'INSERT INTO novel_genres (novel_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [novelId, parseInt(gid)]
      );
    }

    await client.query('COMMIT');
    req.flash('success', 'Novel created successfully.');
    return res.redirect('/admin/novels');
  } catch (err) {
    await client.query('ROLLBACK');
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error('[admin.createNovel]', err);
    return res.render('admin/novel-form', {
      title: 'Add Novel',
      novel: null,
      genres: genres.rows,
      errors: [{ msg: 'Failed to save novel.' }],
      old: req.body,
    });
  } finally {
    client.release();
  }
};

const togglePublish = async (req, res) => {
  try {
    await query(`
      UPDATE novels SET is_published = NOT is_published, updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);
    req.flash('success', 'Publish status updated.');
  } catch (err) {
    console.error('[admin.togglePublish]', err);
    req.flash('error', 'Failed to update status.');
  }
  return res.redirect('/admin/novels');
};

const listChapters = async (req, res) => {
  const { novelId } = req.params;
  const [novelRes, chaptersRes] = await Promise.all([
    query('SELECT id, title FROM novels WHERE id = $1', [novelId]),
    query(`SELECT * FROM chapters WHERE novel_id = $1
           ORDER BY chapter_number`, [novelId]),
  ]);

  if (!novelRes.rows.length) return res.redirect('/admin/novels');

  res.render('admin/chapters', {
    title: `Chapters – ${novelRes.rows[0].title}`,
    novel: novelRes.rows[0],
    chapters: chaptersRes.rows,
  });
};

const newChapter = async (req, res) => {
  const { novelId } = req.params;
  const novelRes    = await query('SELECT id, title FROM novels WHERE id = $1', [novelId]);
  if (!novelRes.rows.length) return res.redirect('/admin/novels');

  const lastRes = await query(
    'SELECT MAX(chapter_number) AS last FROM chapters WHERE novel_id = $1',
    [novelId]
  );
  const nextNumber = (lastRes.rows[0].last || 0) + 1;

  res.render('admin/chapter-form', {
    title: 'Add Chapter',
    novel: novelRes.rows[0],
    chapter: null,
    nextNumber,
    errors: [],
    old: null,
  });
};

const createChapter = async (req, res) => {
  const { novelId } = req.params;
  const { title, content, chapter_number, is_published } = req.body;

  if (!title || !content) {
    req.flash('error', 'Chapter title and content are required.');
    return res.redirect('back');
  }

  const wordCount = content.trim().split(/\s+/).length;

  try {
    await query(`
      INSERT INTO chapters (novel_id, chapter_number, title, content, word_count, is_published)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [novelId, parseInt(chapter_number), title, content, wordCount, is_published === 'on']);

    await query('UPDATE novels SET updated_at = NOW() WHERE id = $1', [novelId]);

    req.flash('success', 'Chapter added successfully.');
    return res.redirect(`/admin/novels/${novelId}/chapters`);
  } catch (err) {
    console.error('[admin.createChapter]', err);
    req.flash('error', 'Failed to save chapter. The chapter number may already exist.');
    return res.redirect('back');
  }
};

const listUsers = async (req, res) => {
  const users = await query(
    'SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  res.render('admin/users', { title: 'Manage Users', users: users.rows });
};

const toggleUserActive = async (req, res) => {
  await query(
    'UPDATE users SET is_active = NOT is_active WHERE id = $1',
    [req.params.id]
  );
  req.flash('success', 'User status updated.');
  return res.redirect('/admin/users');
};

const deleteNovel = async (req, res) => {
  const { id } = req.params;
  const client = await require('../config/database').pool.connect();
  try {
    const novelRes = await client.query(
      'SELECT cover_image FROM novels WHERE id = $1', [id]
    );

    if (!novelRes.rows.length) {
      req.flash('error', 'Novel not found.');
      return res.redirect('/admin/novels');
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM novels WHERE id = $1', [id]);
    await client.query('COMMIT');

    const cover = novelRes.rows[0].cover_image;
    if (cover) {
      const coverPath = path.join(__dirname, '../../public', cover);
      fs.unlink(coverPath, () => {});
    }

    req.flash('success', 'Novel deleted successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin.deleteNovel]', err);
    req.flash('error', 'Failed to delete novel.');
  } finally {
    client.release();
  }
  return res.redirect('/admin/novels');
};

module.exports = {
  dashboard, listNovels, newNovel, createNovel, togglePublish,
  deleteNovel,
  listChapters, newChapter, createChapter,
  listUsers, toggleUserActive,
};
