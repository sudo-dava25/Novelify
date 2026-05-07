require('dotenv').config();

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
