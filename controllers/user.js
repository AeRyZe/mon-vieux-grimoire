const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = (req, res, next) => {
    bcrypt.hash(req.body.password, 15)
    .then(hash => {
        const newUser = new User({
            email: req.body.email,
            password: hash
        });
        newUser.save()
        .then(() => res.status(201).json({ message: 'Nouvel utilisateur enregistré !' }))
        .catch(error => res.status(500).json({ error }))
    })
    .catch(error => res.status(500).json({ error }));
};

exports.login = (req, res, next) => {
    User.findOne({ email: req.body.email })
    .then(user => {
        if (user) {
            bcrypt.compare(req.body.password, user.password)
            .then(valid => {
                if (valid) {
                    res.status(200).json({
                        userId: user._id,
                        token: jwt.sign(
                            { userId: user._id },
                            'ACCOUNT_SECRET_TOKEN',
                            { expiresIn: '24h' }
                        )
                    });
                } else {
                    res.status(401).json({ message: 'Paire email/mot de passe erroné.' });
                };
            })
            .catch(error => res.status(500).json({ error }));
        } else {
            res.status(401).json({ message: 'Paire email/mot de passe erroné.' });
        };
    })
    .catch(error => res.status(500).json({ error }));
};