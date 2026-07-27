var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var expressSession = require('express-session');
var path = require('path');

mongoose.Promise = global.Promise;

// Conexión a la base de datos
mongoose.connect(process.env.NUEVAMONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

var Beer = require("./models/BeerModel");
var Review = require('./models/ReviewModel');

var app = express();

// Para express-session (arregla las advertencias de deprecación)
app.use(expressSession({ 
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Servir estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Estrategia de Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID || '1886152074941466',
    clientSecret: process.env.FB_CLIENT_SECRET || '1d9904d87a3e1b3a0b46692cadcc26ef',
    // Cambia esto por tu URL real de Render cuando pruebes Facebook
    callbackURL: process.env.RENDER_EXTERNAL_URL 
      ? `${process.env.RENDER_EXTERNAL_URL}/auth/facebook/callback` 
      : "http://localhost:8000/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// --- RUTAS ---

// Ruta raíz
app.get('/', function (req, res) {
  res.send("<h1>¡Servidor de Cervezas Funcionando en Render!</h1>");
});

// Rutas de Perfil y Autenticación
app.get('/profile', function(req, res) {
  res.json(req.user || { msg: "No has iniciado sesión" });
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect : '/profile',
    failureRedirect : '/facebookCanceled'
  })
);

app.get('/facebookCanceled', function(req, res) {
  res.send("Fallo la autenticación con Facebook");
});

// API de Cervezas
app.get('/beers', function (req, res) {
  Beer.find(function (error, beers) {
    if (error) return res.status(500).send(error);
    res.send(beers);
  });
});

app.post('/beers', function (req, res, next) {
  var beer = new Beer(req.body);
  beer.save(function(err, beer) {
    if (err) { return next(err); }
    res.json(beer);
  });
});

app.delete('/beers/:id', function (req, res) {
  Beer.findByIdAndRemove(req.params.id, function(err) {
    if (err) return res.status(500).send(err);
    res.send('Person deleted!');
  });
});

app.post('/beers/:id/reviews/', function(req, res, next) {
  Beer.findById(req.params.id, function(err, foundBeer) {
    if (err) { return next(err); }

    var review = new Review(req.body);
    foundBeer.reviews.push(review);
      
    foundBeer.save(function (err, review) {
      if (err) { return next(err); }
      res.json(review);
    });  
  });
});

// Escuchar en el puerto de Render
var PORT = process.env.PORT || 8000;
app.listen(PORT, function() {
  console.log('Servidor corriendo en el puerto ' + PORT);
});