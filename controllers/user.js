const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = (req, res) => {
    bcrypt.hash(req.body.password, 15) // crypte le mot de passe avec 15 tours
    .then(hash => {
        const newUser = new User({ // remplace le mot de passe avec celui crypté par bcrypt
            email: req.body.email,
            password: hash
        });
        newUser.save()
        .then(() => res.status(201).json({ message: 'Nouvel utilisateur enregistré !' }))
        .catch(error => res.status(400).json({ error }));
    })
    .catch(error => res.status(500).json({ error }));
};

exports.login = (req, res) => {
    User.findOne({ email: req.body.email })
    .then(user => {
        if (user) {
            bcrypt.compare(req.body.password, user.password) // vérifie que les mots de passes correspondent bien
            .then(valid => {
                if (valid) {
                    res.status(200).json({
                        userId: user._id,
                        token: jwt.sign( // renvoie un token avec un user ID & la clé secrète du token 
                            { userId: user._id }, // user ID
                            'ACCOUNT_SECRET_TOKEN', // clé secrète
                            { expiresIn: '24h' } // valable pendant 24 heures
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