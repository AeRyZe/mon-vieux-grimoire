const Book = require('../models/book');

const fs = require('fs');

exports.getAllBooks = (req, res, next) => {
    Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error }));
};

exports.getBestRating = (req, res, next) => {
    Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then(books => res.status(200).json(books))
    .catch(error => res.status(500).json({ error }));
};

exports.getOneBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json({ error }));
};

exports.createBook = (req, res, next) => {
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

exports.modifyBook = (req, res, next) => {
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
                fs.unlinkSync(`images/${filename}`);
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

exports.deleteBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
    .then(book => {
        if (book.userId == req.auth.userId) {
            const filename = book.imageUrl.split('/images/')[1];
            fs.unlink(`images/${filename}`, () => {
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

exports.addNewRating = async (req, res, next) => {
    const ratingObject = req.body;
    ratingObject.grade = ratingObject.rating;
    delete ratingObject.rating;

    try {
        const updatedBookRatings = await Book.findOneAndUpdate(
            { _id: req.params.id },
            { $push: { ratings: ratingObject }, $inc: { totalRating: 1 } },
            { new: true }
        );

        let averageRatingOfBook = 0;
        for (let i = 0; i < updatedBookRatings.ratings.length; i++) {
            averageRatingOfBook += updatedBookRatings.ratings[i].grade;
        };
        averageRatingOfBook /= updatedBookRatings.ratings.length;

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