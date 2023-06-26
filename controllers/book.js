const Book = require('../models/book');

const sharp = require('sharp');

const nestedProperty = require('nested-property');

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

exports.createBook = async(req, res) => { // crée un nouveau livre
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;

    try {
        const filename = req.file.filename.split('.')[0];
        const imagePath = `${req.file.destination}/${req.file.filename}`;

        const processedImage = await sharp(imagePath)
        .resize(500, 400)
        .webp({ quality: 80, force: true })
        .toBuffer();

        sharp.cache(false);

        const processedImagePath = `${req.file.destination}/processed_${filename}.webp`;
        await fs.promises.writeFile(processedImagePath, processedImage);

        fs.unlink(req.file.path, async() => {
            let book = new Book({
                ...bookObject,
                userId: req.auth.userId,
                imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
            });

            book.imageUrl = `${req.protocol}://${req.get('host')}/${processedImagePath}`;

            book.save()
            .then(() => res.status(201).json({ message: 'Livre enregistré !'}))
            .catch(error => res.status(400).json({ error }))
        });
    } catch(error) {
        return res.status(400).json({ error });
    };
};

exports.modifyBook = async(req, res) => { // modifie le livre ciblé via :id
    Book.findOne({ _id: req.params.id })
    .then(async book => {
        if (book.userId == req.auth.userId) {
            let bookObject = await req.file ? {
                ...JSON.parse(req.body.book),
                imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
            } : { ...req.body };

            const updateImage = async() => {
                if (req.file) {
                    // met à jour l'url de l'image avec celle de l'image optimisée
                    await nestedProperty.set(bookObject, 'imageUrl', `${req.protocol}://${req.get('host')}/images/processed_${req.file.filename.split('.')[0]}.webp`);
                };
            }

            async function checkFileExist(path, timeout = 1000) {
                let totalTime = 0; 
                let checkTime = timeout / 10;

                return await new Promise((resolve, reject) => {
                    const timer = setInterval(function() { // bloque le code et vérifie toute les secondes si l'image à été crée

                        totalTime += checkTime;
                
                        let fileExists = fs.existsSync(path);
                
                        if (fileExists || totalTime >= timeout) {
                            clearInterval(timer);
                            resolve(fileExists);
                        }
                    }, checkTime);
                });
            }

            if (req.file) {
                const originalFilename = book.imageUrl.split('/images/')[1];
                const newFilename = req.file.filename.split('.')[0] + '.webp';
                const processedImagePath = `images/processed_${newFilename}`;

                try {
                    fs.unlink(`images/${originalFilename}`, async() => { // supprime l'image qui était utilisée avant
                        const processedImage = await sharp(req.file.path)
                        .resize(500, 400)
                        .webp({ quality: 80, force: true })
                        .toBuffer();

                        sharp.cache(false); // vide le cache de sharp afin d'éviter une duplication

                        await fs.promises.writeFile(processedImagePath, processedImage) // enregistre l'image optimisée

                        fs.unlink(req.file.path, () => { // supprime l'image originale
                            console.log('Image traitée avec sharp !');
                        });
                    });
                } catch(error) {
                    console.error(error);
                };
            };

            await checkFileExist(`${req.protocol}://${req.get('host')}/images/processed_${req.file.filename.split('.')[0]}.webp`); // freeze tant que l'image n'est pas trouvée

            await updateImage(); // mets à jour l'URL de l'image avant que l'objet soit enregistré

            Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
            .then(() => res.status(200).json({ message: 'Livre modifié !' }))
            .catch(error => res.status(401).json({ error }));
        } else {
            return res.status(403).json({ message: 'Requête non-autorisée !' });
        };
    })
    .catch(error => res.status(400).json({ error: error.data }));
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