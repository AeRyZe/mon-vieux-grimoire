const Book = require('../models/book');

const fs = require('fs');

exports.getAllBooks = (req, res) => { // récupère tout les livres
    Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error }));
};

exports.getBestRating = (req, res) => { // array des 3 livres les mieux notés
    Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then(books => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }));
};

exports.getOneBook = (req, res) => { // récupère le livre ciblé via :id
    Book.findOne({ _id: req.params.id })
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json({ error }));
};

exports.createBook = (req, res) => { // crée un nouveau livre
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;
    const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    });

    book.save()
    .then(() => res.status(201).json({ message: 'Livre enregistré !' }))
    .catch(error => res.status(400).json({ error }));
};

exports.modifyBook = (req, res) => { // modifie le livre ciblé via :id
    const bookObject = req.file ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    } : { ...req.body };
    delete bookObject._id;

    Book.findOne({ _id: req.params.id })
    .then(book => {
        if (book.userId == req.auth.userId) {
            if (req.file) {
                const filename = book.imageUrl.split('/images/')[1];
                fs.unlinkSync(`images/${filename}`); // supprime l'image qui était utilisée avant
            };
            Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
            .then(() => res.status(200).json({ message: 'Livre modifié !' }))
            .catch(error => res.status(401).json({ error }));
        } else {
            return res.status(403).json({ message: 'Requête non-autorisée !' });
        };
    })
    .catch(error => res.status(400).json({ error }));
};

exports.deleteBook = (req, res) => { // supprime un livre
    Book.findOne({ _id: req.params.id })
    .then(book => {
        if (book.userId == req.auth.userId) {
            const filename = book.imageUrl.split('/images/')[1];
            fs.unlink(`images/${filename}`, () => { // supprime l'image liée au livre en question
                Book.deleteOne({ _id: req.params.id }, { ...req.body, _id: req.params.id })
                .then(() => res.status(200).json({ message: 'Livre supprimé !' }))
                .catch(error => res.status(401).json({ error }));
            })
        } else {
            return res.status(403).json({ message: 'Requête non-autorisée !' });
        };
    })
    .catch(error => res.status(404).json({ error }));
};

// on utilise async pour await et obtenir les informations avant de continuer la résolution du script
exports.addNewRating = async (req, res) => { // ajoute une note au livre ciblé via :id
    const ratingObject = req.body;
    ratingObject.grade = ratingObject.rating;
    delete ratingObject.rating;

    try {
        const updatedBookRatings = await Book.findOneAndUpdate(
            { _id: req.params.id },
            { $push: { ratings: ratingObject }, $inc: { totalRating: 1 } }, // ajout de la note et ajout de 1 au nombre total de notes
            { new: true }
        );

        let averageRatingOfBook = 0;
        for (let i = 0; i < updatedBookRatings.ratings.length; i++) {
            averageRatingOfBook += updatedBookRatings.ratings[i].grade;
        };
        averageRatingOfBook /= updatedBookRatings.ratings.length; // calcul de la note moyenne du livre

        const updatedBook = await Book.findOneAndUpdate(
            { _id: req.params.id },
            { averageRating: averageRatingOfBook },
            { new: true }
        );

        return res.status(201).json({
            book: updatedBook,
            _id: req.params.id
        });
    } catch(error) {
        return res.status(401).json({ error });
    };
};