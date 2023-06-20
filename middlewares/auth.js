const jwt = require('jsonwebtoken');

require('dotenv').config();

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET); // vérifie que le token correspond bien via la clé
        const userId = decodedToken.userId;

        req.auth = {
            userId: userId // assigne l'ID du compte à la requête
        };
        next();
    } catch(error) {
        res.status(401).json({ error });
    };
};