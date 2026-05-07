# Novelify

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

- Node.js ≥ 18
- PostgreSQL ≥ 14

## Installation

```bash
# 1. Clone & enter directory
cd Novelify

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env → adjust DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, SESSION_SECRET

# 4. Create database
createdb Novelify_db   # or via pgAdmin

# 5. Run migrations (create all tables)
npm run db:migrate

# 6. Seed initial genre data
npm run db:seed

# 7. Create the first admin user directly via psql
#    (or register via /auth/register then manually update the role)
psql Novelify_db -c "UPDATE users SET role='admin' WHERE email='admin@example.com';"

# 8. Start the server
npm run dev       # development (nodemon)
npm start         # production
```

Server runs at http://localhost:3000

## Folder Structure

```
Novelify/
├── src/
│   ├── app.js                    ← Entry point
│   ├── config/
│   │   ├── database.js           ← PostgreSQL connection pool
│   │   ├── migrate.js            ← DDL for all tables
│   │   └── seed.js               ← Initial genre data
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── novelController.js
│   │   ├── adminController.js
│   │   └── userController.js
│   ├── middlewares/
│   │   ├── auth.js               ← requireAuth, requireRole, injectUser
│   │   └── upload.js             ← Multer (novel cover)
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
│   └── img/covers/               ← Uploaded cover files (auto-created)
├── .env.example
└── package.json
```

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
6. 
