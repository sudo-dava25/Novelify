const { body } = require('express-validator');

const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers, and underscores.'),
  body('email')
    .isEmail().withMessage('Invalid email format.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
  body('password_confirm').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Password confirmation does not match.');
    return true;
  }),
];

const loginRules = [
  body('email').isEmail().withMessage('Invalid email format.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = { registerRules, loginRules };
