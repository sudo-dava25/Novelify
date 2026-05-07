const { query }    = require('../config/database');
const slugify      = require('slugify');
const { validationResult } = require('express-validator');
const fs           = require('fs');
const path         = require('path');

async function getAllGenres() {
  const res = await query('SELECT * FROM genres ORDER BY name');
  return res.rows;
}

const index = async (req, res) => {
  try {
    const { search, genre, status } = req.query;
    const conditions = ['n.is_published = TRUE'];
    const params     = [];
    let   idx        = 1;

    if (search) {
      conditions.push(`(n.title ILIKE $${idx} OR u.username ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (genre) {
      conditions.push(`EXISTS (
        SELECT 1 FROM novel_genres ng2
        JOIN genres g2 ON g2.id = ng2.genre_id
        WHERE ng2.novel_id = n.id AND g2.slug = $${idx}
      )`);
      params.push(genre);
      idx++;
    }
    if (status && ['ongoing', 'completed', 'hiatus'].includes(status)) {
      conditions.push(`n.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const WHERE = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const novels = await query(`
      SELECT
        n.id, n.title, n.slug, n.synopsis, n.cover_image, n.status,
        n.view_count, n.created_at,
        u.username AS author_name,
        COALESCE(AVG(r.score), 0)::NUMERIC(3,1) AS avg_rating,
        COUNT(DISTINCT r.id) AS rating_count,
        ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) AS genres
      FROM novels n
      JOIN users u ON u.id = n.author_id
      LEFT JOIN ratings r ON r.novel_id = n.id
      LEFT JOIN novel_genres ng ON ng.novel_id = n.id
      LEFT JOIN genres g ON g.id = ng.genre_id
      ${WHERE}
      GROUP BY n.id, u.username
      ORDER BY n.created_at DESC
      LIMIT 20
    `, params);

    const genres = await getAllGenres();

    res.render('novels/index', {
      title: 'Browse Novels',
      novels: novels.rows,
      genres,
      filters: { search, genre, status },
    });
  } catch (err) {
    console.error('[novel.index]', err);
    res.render('error', { message: 'Failed to load novel list.' });
  }
};

const show = async (req, res) => {
  try {
    const { slug } = req.params;

    const novelRes = await query(`
      SELECT
        n.*,
        u.username AS author_name, u.id AS author_id,
        COALESCE(AVG(r.score), 0)::NUMERIC(3,1) AS avg_rating,
        COUNT(DISTINCT r.id) AS rating_count
      FROM novels n
      JOIN users u ON u.id = n.author_id
      LEFT JOIN ratings r ON r.novel_id = n.id
      WHERE n.slug = $1 AND n.is_published = TRUE
      GROUP BY n.id, u.username, u.id
    `, [slug]);

    if (!novelRes.rows.length) {
      return res.status(404).render('error', { message: 'Novel not found.' });
    }

    const novel = novelRes.rows[0];

    query('UPDATE novels SET view_count = view_count + 1 WHERE id = $1', [novel.id])
      .catch(console.error);

    const [chaptersRes, genresRes, ratingsRes, userRatingRes, bookmarkRes, progressRes] =
      await Promise.all([
        query(`SELECT id, chapter_number, title, created_at
               FROM chapters WHERE novel_id = $1 AND is_published = TRUE
               ORDER BY chapter_number`, [novel.id]),
        query(`SELECT g.name, g.slug FROM genres g
               JOIN novel_genres ng ON ng.genre_id = g.id
               WHERE ng.novel_id = $1`, [novel.id]),
        query(`SELECT r.score, r.review, r.created_at, u.username
               FROM ratings r JOIN users u ON u.id = r.user_id
               WHERE r.novel_id = $1 ORDER BY r.created_at DESC LIMIT 10`, [novel.id]),
        res.locals.currentUser
          ? query(`SELECT score, review FROM ratings
                   WHERE novel_id = $1 AND user_id = $2`,
                  [novel.id, res.locals.currentUser.id])
          : Promise.resolve({ rows: [] }),
        res.locals.currentUser
          ? query(`SELECT id FROM bookmarks WHERE novel_id = $1 AND user_id = $2`,
                  [novel.id, res.locals.currentUser.id])
          : Promise.resolve({ rows: [] }),
        res.locals.currentUser
          ? query(`SELECT c.chapter_number FROM reading_progress rp
                   JOIN chapters c ON c.id = rp.last_chapter_id
                   WHERE rp.novel_id = $1 AND rp.user_id = $2`,
                  [novel.id, res.locals.currentUser.id])
          : Promise.resolve({ rows: [] }),
      ]);

    res.render('novels/show', {
      title: novel.title,
      novel,
      chapters:     chaptersRes.rows,
      genres:       genresRes.rows,
      reviews:      ratingsRes.rows,
      userRating:   userRatingRes.rows[0] || null,
      isBookmarked: bookmarkRes.rows.length > 0,
      progress:     progressRes.rows[0] || null,
    });
  } catch (err) {
    console.error('[novel.show]', err);
    res.render('error', { message: 'Failed to load novel.' });
  }
};

const readChapter = async (req, res) => {
  try {
    const { id } = req.params;

    const chapterRes = await query(`
      SELECT c.*, n.title AS novel_title, n.slug AS novel_slug, n.id AS novel_id,
             n.author_id
      FROM chapters c
      JOIN novels n ON n.id = c.novel_id
      WHERE c.id = $1 AND c.is_published = TRUE AND n.is_published = TRUE
    `, [id]);

    if (!chapterRes.rows.length) {
      return res.status(404).render('error', { message: 'Chapter not found.' });
    }

    const chapter = chapterRes.rows[0];

    const [prevRes, nextRes, commentsRes] = await Promise.all([
      query(`SELECT id, chapter_number, title FROM chapters
             WHERE novel_id = $1 AND chapter_number < $2 AND is_published = TRUE
             ORDER BY chapter_number DESC LIMIT 1`,
            [chapter.novel_id, chapter.chapter_number]),
      query(`SELECT id, chapter_number, title FROM chapters
             WHERE novel_id = $1 AND chapter_number > $2 AND is_published = TRUE
             ORDER BY chapter_number ASC LIMIT 1`,
            [chapter.novel_id, chapter.chapter_number]),
      query(`SELECT c.*, u.username, u.avatar
             FROM comments c JOIN users u ON u.id = c.user_id
             WHERE c.chapter_id = $1 AND c.is_deleted = FALSE AND c.parent_id IS NULL
             ORDER BY c.created_at DESC`,
            [id]),
    ]);

    if (res.locals.currentUser) {
      query(`
        INSERT INTO reading_progress (user_id, novel_id, last_chapter_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, novel_id)
        DO UPDATE SET last_chapter_id = $3, updated_at = NOW()
      `, [res.locals.currentUser.id, chapter.novel_id, chapter.id]).catch(console.error);
    }

    res.render('chapters/read', {
      title: `${chapter.novel_title} – Chapter ${chapter.chapter_number}`,
      chapter,
      prevChapter: prevRes.rows[0] || null,
      nextChapter: nextRes.rows[0] || null,
      comments:    commentsRes.rows,
    });
  } catch (err) {
    console.error('[novel.readChapter]', err);
    res.render('error', { message: 'Failed to load chapter.' });
  }
};

const toggleBookmark = async (req, res) => {
  const { novelId } = req.body;
  const userId = res.locals.currentUser.id;

  try {
    const existing = await query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND novel_id = $2',
      [userId, novelId]
    );
    if (existing.rows.length) {
      await query('DELETE FROM bookmarks WHERE user_id = $1 AND novel_id = $2',
                  [userId, novelId]);
      return res.json({ bookmarked: false });
    }
    await query('INSERT INTO bookmarks (user_id, novel_id) VALUES ($1, $2)',
                [userId, novelId]);
    return res.json({ bookmarked: true });
  } catch (err) {
    console.error('[toggleBookmark]', err);
    return res.status(500).json({ error: 'Failed to update bookmark.' });
  }
};

const submitRating = async (req, res) => {
  const { novelId, score, review } = req.body;
  const userId = res.locals.currentUser.id;
  const parsedScore = parseInt(score);

  if (!novelId || parsedScore < 1 || parsedScore > 5) {
    req.flash('error', 'Invalid rating data.');
    return res.redirect('back');
  }

  try {
    await query(`
      INSERT INTO ratings (novel_id, user_id, score, review)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (novel_id, user_id)
      DO UPDATE SET score = $3, review = $4, updated_at = NOW()
    `, [novelId, userId, parsedScore, review || null]);

    req.flash('success', 'Rating saved successfully.');
    return res.redirect('back');
  } catch (err) {
    console.error('[submitRating]', err);
    req.flash('error', 'Failed to save rating.');
    return res.redirect('back');
  }
};

const submitComment = async (req, res) => {
  const { chapterId, content, parentId } = req.body;
  const userId = res.locals.currentUser.id;

  if (!content || content.trim().length < 1) {
    req.flash('error', 'Comment cannot be empty.');
    return res.redirect('back');
  }

  try {
    await query(
      `INSERT INTO comments (chapter_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)`,
      [chapterId, userId, parentId || null, content.trim()]
    );
    return res.redirect('back');
  } catch (err) {
    console.error('[submitComment]', err);
    req.flash('error', 'Failed to post comment.');
    return res.redirect('back');
  }
};

module.exports = {
  index, show, readChapter,
  toggleBookmark, submitRating, submitComment,
};
