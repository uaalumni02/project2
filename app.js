require('dotenv').config();
// var inquirer = require('inquirer');
var mysql = require('mysql');
var express = require('express');
var twilio = require('twilio');
var mongoose = require('mongoose');
//var mongoose.Promise = require('bluebird');
var Booking = require('./models/Booking');
var User = require('./models/User');
var bodyParser = require('body-parser');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'mecotyya1!',
    database: 'barbershop'
});


var DB_URL = process.env.MONGO_URL;
var TOKEN = process.env.TOKEN;

var PORT = process.env.PORT || 3000;

var TWILIO_ID = process.env.TWILIO_ACCOUNT_ID;
var TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
var TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
var Twilio = twilio(TWILIO_ID, TWILIO_TOKEN);


// MySQL connect
connection.connect(function() {
    console.log('Connection successful');
});

// Connect to mongoose
mongoose.connect(DB_URL, { useMongoClient: true }).then(function() {
    console.log("Connection successful")
}).catch(function() {
    console.log('Unable to connect');
})
mongoose.Promise = global.Promise;


app.use(express.static('public'));
// Parsing the request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// manages user session
app.use(cookieParser());
app.use(session({
    key: 'user_sid',
    secret: 'sampleSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

// This middleware will check if user's cookie is still saved in the browser and user's session is not set, then automatically logs out the user;
// this usually happens if you stopped your express server, the cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
})

// middleware to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        next();
    } else {
        return res.sendFile(path.join(__dirname + '/views/login.html'));
    }
}

app.get('/', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/index.html'));
});

app.get('/reservation', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/reservation.html'));
});
app.get('/productlist', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/productlist.html'));
});
app.get('/Inventoryinput', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/Inventoryinput.html'));
});

app.post('/Inventoryinput', sessionChecker, function(req, res) {
    var productId = parseInt(req.body.product_id);
    var quantityRestock = req.body.qty_restock || 0;
    var quantityDeplete = req.body.qty_deplete || 0;
    var sqlQuery;
    var productQuantity;

    var operation = quantityDeplete > quantityRestock ? 'REMOVE' : 'ADD';

    return connection.query(`SELECT StockQuantity from Products WHERE ItemId = "${productId}"`, function(err, result) {
        console.log(result);
        var quantityAvailable = Number(result[0].StockQuantity);
        var newQuantity;
        console.log('===' + quantityAvailable);
        if (operation == 'REMOVE') {
            newQuantity = quantityAvailable - Number(quantityDeplete);
        } else {
            newQuantity = quantityAvailable + Number(quantityRestock);
        }
        var sqlQueryOperation = `UPDATE Products SET StockQuantity = ${newQuantity} WHERE ItemId = "${productId}"`;
        return connection.query(sqlQueryOperation, function(error, data) {
            console.log(error, data)
            if (!error) {
                return res.status(201).redirect('/products'); //('Data Updated Successfully');
            } else {
                return res.status(400).json(error.message);
            }
        });
    })

});

app.post('/reservation', function(req, res) {
    // Post the form here ...
    var userDateTime = req.body.datetime;
    var userName = req.body.name;
    var userPhone = req.body.phone;
    var userEmail = req.body.email;
    var userService = req.body.service;
    var userId = req.body.id;
    var bookingDate = userDateTime.split(" ")[0];
    var bookingTime = userDateTime.split(" ")[1];
    var userMessage = userName + ', your appointment is on ' + bookingDate + ' at ' + bookingTime;
    var userBooking = new Booking({ name: userName, date: userDateTime });
    return userBooking.save(function(err) {
        if (!err) {
            return Twilio.messages.create({
                body: userMessage,
                to: userPhone,
                from: TWILIO_PHONE,
            }).then(function(response) {
                // return res.status(200).send(JSON.stringify(req.body));
                return res.sendFile(path.join(__dirname + '/views/success.html'));
            }).catch(function(err) {
                return res.send('Unable to send SMS');
            });
        } else {
            console.log(err.message)
            return res.send('Unable to save data')
        }
    });

});

app.get('/api/products', sessionChecker, function(req, res) {
    return connection.query('SELECT * FROM Products', function(err, results) {
        return res.json(results);
    });
});

app.get('/products', sessionChecker, function(req, res) {
    return res.sendFile(path.join(__dirname + '/views/allproducts.html'));
});


app.get('/login', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/login.html'));
});

// app.get('/services', function (req, res) {
//     return res.sendFile(path.join(__dirname + '/views/services.html'));
// });

app.get('/index', sessionChecker, function(req, res) {
    return res.sendFile(path.join(__dirname + '/views/index.html'));
});


app.get('/allBookings', function(req, res) {
    var token = req.query.token;
    if (token == TOKEN) {
        return Booking.find({}, function(err, data) {
            if (err) {
                console.log('Unable to find documents');
            } else {
                if (data) {
                    var html = '';
                    data.forEach(function(entry) {
                        html += `
                            <p> Name: <span> ${ entry.name } </span> </p> 
                            <p> Date: <span> ${entry.date} </span> </p>
                        `
                    });
                    return res.status(200).send(
                        html
                    );
                }
            }
        })
    } else {
        return res.send('You are unauthorized');
    }
});

app.post('/register', (req, res) => {
    User.create(req.body).then(user => {
        res.send(user)
    }).catch(err => res.send(err));
});

app.post('/login', (req, res) => {
    console.log('got here', req.body)
    User.findOne({ username: req.body.username, password: req.body.password }, (err, user) => {
        if (err || !user) {
            return res.sendFile(path.join(__dirname + '/views/login.html'));
        } else {
            req.session.user = user;
            return res.sendFile(path.join(__dirname + '/views/index.html'));
        }
    });
});

app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
    }
    res.redirect('/login');
});

app.listen(PORT, function() {
    console.log('App is running on PORT ' + PORT);
})