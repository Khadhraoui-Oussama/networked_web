module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Please log in to access this page');
        res.redirect('/auth/login');
    },

    ensureGuest: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        res.redirect('/');
    },

    ensureAdmin: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'admin') {
            return next();
        }
        req.flash('error_msg', 'Access denied. Admin privileges required.');
        res.redirect('/');
    },

    ensureCompany: function(req, res, next) {
        if (req.isAuthenticated() && (req.user.role === 'company' || req.user.role === 'admin')) {
            return next();
        }
        req.flash('error_msg', 'Access denied. Company account required.');
        res.redirect('/');
    }
};
