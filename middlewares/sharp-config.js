const sharp = require('sharp');
const fs = require('fs');

module.exports = async(req, res, next) => {
    const newFilename = `${req.file.filename.split('.')[0]}.webp`;
    const newPath = `${req.file.destination}/processed_${newFilename}`;

    sharp(`${req.file.destination}/${req.file.filename}`)
    .resize(500, 400)
    .webp({ quality: 50, force: true })
    .toFile(newPath, () => {
        fs.unlink(`${req.file.destination}/${req.file.filename}`, () => {
            console.log('Image traité avec sharp');
        });
    });

    next();
};