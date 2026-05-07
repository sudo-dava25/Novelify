require('dotenv').config();
const { pool } = require('./database');

const genres = [
  { name: 'Fantasy',      slug: 'fantasy' },
  { name: 'Romance',      slug: 'romance' },
  { name: 'Action',       slug: 'action' },
  { name: 'Mystery',      slug: 'mystery' },
  { name: 'Horror',       slug: 'horror' },
  { name: 'Sci-Fi',       slug: 'sci-fi' },
  { name: 'Slice of Life', slug: 'slice-of-life' },
  { name: 'Drama',        slug: 'drama' },
  { name: 'Comedy',       slug: 'comedy' },
  { name: 'Thriller',     slug: 'thriller' },
  { name: 'Isekai',       slug: 'isekai' },
  { name: 'BL',           slug: 'bl' },
  { name: 'GL',           slug: 'gl' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding genres...');
    for (const g of genres) {
      await client.query(
        `INSERT INTO genres (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
        [g.name, g.slug]
      );
    }
    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
