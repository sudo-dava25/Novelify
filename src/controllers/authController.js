const bcrypt         = require('bcryptjs');
const { query }      = require('../config/database');
const { validationResult } = require('express-validator');

const showRegister = (req, res) => {
  res.render('auth/register', { title: 'Create Account', errors: [] });
};

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Create Account',
      errors: errors.array(),
      old: req.body,
    });
  }

  const { username, email, password } = req.body;

  try {
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.render('auth/register', {
        title: 'Create Account',
        errors: [{ msg: 'Email or username is already taken.' }],
        old: req.body,
      });
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3) RETURNING id, username, email, role`,
      [username, email, hashed]
    );

    req.session.user = result.rows[0];
    req.flash('success', `Welcome, ${username}!`);
    return res.redirect('/');
  } catch (err) {
    console.error('[register]', err);
    return res.render('auth/register', {
      title: 'Create Account',
      errors: [{ msg: 'A server error occurred. Please try again.' }],
      old: req.body,
    });
  }
};

const showLogin = (req, res) => {
  res.render('auth/login', { title: 'Sign In', errors: [] });
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: 'Sign In',
      errors: errors.array(),
      old: req.body,
    });
  }

  const { email, password } = req.body;

  try {
    const result = await query(
      'SELECT id, username, email, password, role, is_active FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('auth/login', {
        title: 'Sign In',
        errors: [{ msg: 'Incorrect email or password.' }],
        old: { email },
      });
    }

    if (!user.is_active) {
      return res.render('auth/login', {
        title: 'Sign In',
        errors: [{ msg: 'Your account has been deactivated.' }],
        old: { email },
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    req.flash('success', `Welcome back, ${user.username}!`);
    const redirect = req.session.returnTo || '/';
    delete req.session.returnTo;
    return res.redirect(redirect);
  } catch (err) {
    console.error('[login]', err);
    return res.render('auth/login', {
      title: 'Sign In',
      errors: [{ msg: 'A server error occurred. Please try again.' }],
      old: { email },
    });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('[logout]', err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

module.exports = { showRegister, register, showLogin, login, logout };
