# NovelKu

<<<<<<< HEAD
Online novel reading platform based on Node.js + Express + PostgreSQL.

## Features

- Authentication (register, login, logout) with session & bcrypt
- Roles: `reader`, `author`, `admin`
- Browse & search novels (search by title/author, filter by genre & status)
- Novel detail page with chapter list, ratings, and reviews
- Chapter reader with prev/next navigation & automatic progress tracking
- Comments for each chapter (nested support)
- Bookmark novels (AJAX toggle)
- Reading progress tracker
- Star rating & review system
- Admin panel: manage novels (CRUD), chapters, genres, and users

## Prerequisites
=======
Platform membaca novel online berbasis Node.js + Express + PostgreSQL.

## Fitur

- Autentikasi (register, login, logout) dengan session & bcrypt
- Role: `reader`, `author`, `admin`
- Jelajahi & pencarian novel (search judul/penulis, filter genre & status)
- Halaman detail novel dengan chapter list, rating, review
- Reader chapter dengan navigasi prev/next & tracking progress otomatis
- Komentar per chapter (nested support)
- Bookmark novel (AJAX toggle)
- Reading progress tracker
- Rating & review bintang
- Admin panel: kelola novel (CRUD), chapter, genre, dan user

## Prasyarat
>>>>>>> 18ef045 (Initial Commit)

- Node.js ≥ 18
- PostgreSQL ≥ 14

<<<<<<< HEAD
## Installation

```bash
# 1. Clone & enter directory
cd novelku

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env → adjust DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, SESSION_SECRET

# 4. Create database
createdb novelku_db   # or via pgAdmin

# 5. Run migrations (create all tables)
npm run db:migrate

# 6. Seed initial genre data
npm run db:seed

# 7. Create the first admin user directly via psql
#    (or register via /auth/register then manually update the role)
psql novelku_db -c "UPDATE users SET role='admin' WHERE email='admin@example.com';"

# 8. Start the server
=======
## Instalasi

```bash
# 1. Clone & masuk direktori
cd novelku

# 2. Install dependensi
npm install

# 3. Salin dan isi environment variable
cp .env.example .env
# Edit .env → sesuaikan DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, SESSION_SECRET

# 4. Buat database
createdb novelku_db   # atau lewat pgAdmin

# 5. Jalankan migrasi (buat semua tabel)
npm run db:migrate

# 6. Seed data genre awal
npm run db:seed

# 7. Buat user admin pertama langsung via psql
#    (atau daftarkan lewat /auth/register lalu update role manual)
psql novelku_db -c "UPDATE users SET role='admin' WHERE email='admin@example.com';"

# 8. Jalankan server
>>>>>>> 18ef045 (Initial Commit)
npm run dev       # development (nodemon)
npm start         # production
```

<<<<<<< HEAD
Server runs at http://localhost:3000

## Folder Structure
=======
Server berjalan di http://localhost:3000

## Struktur Folder
>>>>>>> 18ef045 (Initial Commit)

```
novelku/
├── src/
│   ├── app.js                    ← Entry point
│   ├── config/
<<<<<<< HEAD
│   │   ├── database.js           ← PostgreSQL connection pool
│   │   ├── migrate.js            ← DDL for all tables
│   │   └── seed.js               ← Initial genre data
=======
│   │   ├── database.js           ← Pool koneksi PostgreSQL
│   │   ├── migrate.js            ← DDL semua tabel
│   │   └── seed.js               ← Data genre awal
>>>>>>> 18ef045 (Initial Commit)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── novelController.js
│   │   ├── adminController.js
│   │   └── userController.js
│   ├── middlewares/
│   │   ├── auth.js               ← requireAuth, requireRole, injectUser
<<<<<<< HEAD
│   │   └── upload.js             ← Multer (novel cover)
=======
│   │   └── upload.js             ← Multer (cover novel)
>>>>>>> 18ef045 (Initial Commit)
│   ├── routes/
│   │   └── index.js
│   └── validators/
│       └── authValidator.js
├── views/
│   ├── layouts/main.ejs
│   ├── auth/{login,register}.ejs
│   ├── novels/{index,show}.ejs
│   ├── chapters/read.ejs
│   ├── admin/{dashboard,novels,novel-form,chapters,chapter-form,users}.ejs
│   ├── user/profile.ejs
│   └── error.ejs
├── public/
│   ├── css/main.css
│   ├── js/main.js
<<<<<<< HEAD
│   └── img/covers/               ← Uploaded cover files (auto-created)
=======
│   └── img/covers/               ← File cover upload (auto-created)
>>>>>>> 18ef045 (Initial Commit)
├── .env.example
└── package.json
```

<<<<<<< HEAD
## Database Schema

| Table | Description |
|---|---|
| `users` | User accounts (reader/author/admin) |
| `genres` | List of genres |
| `novels` | Novel information |
| `novel_genres` | Novel ↔ genre relationship (many-to-many) |
| `chapters` | Chapters for each novel |
| `comments` | Comments for each chapter (nested) |
| `ratings` | Rating & review from each user for each novel |
| `bookmarks` | Saved novels for each user |
| `reading_progress` | Last chapter read by each user for each novel |

## Security

- All queries use parameterized statements (`$1, $2, ...`) → protected against SQL injection
- Passwords are hashed with bcrypt (cost factor 12)
- Session cookies are `httpOnly`, and `secure` in production
- File uploads are validated by MIME type & size, filenames are randomized
- Role-based access control via `requireRole` middleware
- Input validation on all forms using express-validator

## Recommended Next Steps

1. Add pagination to the novel and chapter lists
2. Implement edit/delete functionality for novels and chapters
3. Add comment reply feature (`parent_id` is already available in the schema)
4. Add rate limiting with `express-rate-limit` for the login endpoint
5. Deploy with PM2 + Nginx + HTTPS
=======
## Skema Database

| Tabel | Keterangan |
|---|---|
| `users` | Akun pengguna (reader/author/admin) |
| `genres` | Daftar genre |
| `novels` | Informasi novel |
| `novel_genres` | Relasi novel ↔ genre (many-to-many) |
| `chapters` | Chapter setiap novel |
| `comments` | Komentar per chapter (nested) |
| `ratings` | Rating & review per novel per user |
| `bookmarks` | Novel tersimpan per user |
| `reading_progress` | Chapter terakhir dibaca per user per novel |

## Keamanan

- Semua query menggunakan parameterized (`$1, $2, ...`) → aman dari SQL injection
- Password di-hash dengan bcrypt (cost factor 12)
- Session cookie bersifat `httpOnly`, `secure` di production
- Upload file divalidasi MIME type & ukuran, nama file di-randomize
- Role-based access control via middleware `requireRole`
- Validasi input di semua form menggunakan express-validator

## Langkah Lanjutan (Saran)

1. Tambahkan pagination di daftar novel & chapter
2. Implementasi edit/hapus novel dan chapter
3. Tambahkan fitur reply komentar (parent_id sudah tersedia di skema)
4. Rate limiting dengan `express-rate-limit` untuk endpoint login
5. Deploy dengan PM2 + Nginx + HTTPS
>>>>>>> 18ef045 (Initial Commit)
