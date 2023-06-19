const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const userRoutes = require('./routes/user');
const bookRoutes = require('./routes/book');

const app = express();

mongoose.connect('mongodb+srv://laurent:1amtheone@cluster0.ldyi2wp.mongodb.net/', // connection à MongoDB via mongoose
  { useNewUrlParser: true,
    useUnifiedTopology: true })
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch(() => console.log('Connexion à MongoDB échouée !'));

app.use(express.json());

app.use((req, res, next) => { // paramètrage des requêtes à API
  res.setHeader('Access-Control-Allow-Origin', '*'); // Origine des requêtes possible
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization'); // Headers utilisables
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS'); // Verbes HTTP utilisables
  next();
});

app.use('/api/auth', userRoutes); // Routage pour users

app.use('/api/books', bookRoutes); // Routage pour livres

app.use('/images', express.static(path.join(__dirname, 'images'))); // Routage des images

module.exports = app;