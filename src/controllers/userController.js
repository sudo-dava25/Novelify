const { query } = require('../config/database');

const profile = async (req, res) => {
  const userId = res.locals.currentUser.id;

  const [bookmarksRes, progressRes] = await Promise.all([
    query(`
      SELECT n.id, n.title, n.slug, n.cover_image, n.status,
             u.username AS author_name, b.created_at AS bookmarked_at
      FROM bookmarks b
      JOIN novels n ON n.id = b.novel_id
      JOIN users u ON u.id = n.author_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [userId]),
    query(`
      SELECT n.id, n.title, n.slug, n.cover_image,
             c.chapter_number AS last_chapter, c.title AS last_chapter_title,
             c.id AS last_chapter_id, rp.updated_at AS last_read_at
      FROM reading_progress rp
      JOIN novels n ON n.id = rp.novel_id
      JOIN chapters c ON c.id = rp.last_chapter_id
      WHERE rp.user_id = $1
      ORDER BY rp.updated_at DESC
    `, [userId]),
  ]);

  res.render('user/profile', {
    title: 'My Profile',
    bookmarks: bookmarksRes.rows,
    progress:  progressRes.rows,
  });
};

module.exports = { profile };
