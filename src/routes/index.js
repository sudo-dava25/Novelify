const express      = require('express');
const router       = express.Router();
const novelCtrl    = require('../controllers/novelController');
const authCtrl     = require('../controllers/authController');
const adminCtrl    = require('../controllers/adminController');
const userCtrl     = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middlewares/auth');
const upload       = require('../middlewares/upload');
const { registerRules, loginRules } = require('../validators/authValidator');

router.get('/',                   novelCtrl.index);
router.get('/novels/:slug',       novelCtrl.show);
router.get('/chapters/:id',       novelCtrl.readChapter);

router.get ('/auth/register',    authCtrl.showRegister);
router.post('/auth/register', registerRules, authCtrl.register);
router.get ('/auth/login',       authCtrl.showLogin);
router.post('/auth/login',    loginRules,    authCtrl.login);
router.post('/auth/logout',      requireAuth,   authCtrl.logout);

router.get ('/user/profile',        requireAuth, userCtrl.profile);
router.post('/bookmarks/toggle',    requireAuth, novelCtrl.toggleBookmark);
router.post('/ratings',             requireAuth, novelCtrl.submitRating);
router.post('/comments',            requireAuth, novelCtrl.submitComment);

const admin = require('express').Router();
admin.use(requireAuth, requireRole('admin'));

admin.get ('/',                              adminCtrl.dashboard);
admin.get ('/novels',                        adminCtrl.listNovels);
admin.get ('/novels/new',                    adminCtrl.newNovel);
admin.post('/novels',     upload.single('cover'), adminCtrl.createNovel);
admin.post('/novels/:id/toggle-publish',     adminCtrl.togglePublish);
admin.post('/novels/:id/delete', adminCtrl.deleteNovel);
admin.get ('/novels/:novelId/chapters',      adminCtrl.listChapters);
admin.get ('/novels/:novelId/chapters/new',  adminCtrl.newChapter);
admin.post('/novels/:novelId/chapters',      adminCtrl.createChapter);
admin.get ('/users',                         adminCtrl.listUsers);
admin.post('/users/:id/toggle-active',       adminCtrl.toggleUserActive);

router.use('/admin', admin);

module.exports = router;
