/** Setup dotenv module to expose environment variables **/
require('dotenv').config();

/** Import  modules **/
var mysql = require('mysql');
var express = require('express');
var twilio = require('twilio');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');

/** Create an instance of express server */
var app = express();


/** Import helper module pinger to keep db connection alive */
var pinger = require('./helpers/ping-db');


/** Import models */
var Booking = require('./models/Booking');
var User = require('./models/User');

/** Define SQL DB config credentials */
var db = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

/** Connect to database passing in the provided credentials*/
var connection = require('./helpers/connection')(db);


/** Ping the database every 10 seconds to keep connection alive */
setInterval(function() { pinger(connection) }, 10000);




var DB_URL = process.env.MONGO_URL;
var TOKEN = process.env.TOKEN;

/** Choose port from environment file or use 3000 if no PORT in environment */
var PORT = process.env.PORT || 3000;

var TWILIO_ID = process.env.TWILIO_ACCOUNT_ID;
var TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
var TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

/** Create an instance of twilio passing in the Twilio credentials */
var Twilio = twilio(TWILIO_ID, TWILIO_TOKEN);


/* Watch and print message to the console when MYSQL connects */
connection.connect(function() {
    console.log('Connected');
});



// Connect to mongoose
mongoose.connect(DB_URL, { useMongoClient: true }).then(function() {
    console.log("Connection successful")
}).catch(function() {
    console.log('Unable to connect');
})
mongoose.Promise = global.Promise;



/** Set public as directory for static files (JS, images, css) */
app.use(express.static('public'));

/* Setup body parser as middleware to parse request body */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// manages user session; there are a lot of great examples online regarding this
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
// If user does not have a valid session or cookie, then it serves a page ('login')
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        next();
    } else {
        return res.sendFile(path.join(__dirname + '/views/login.html'));
    }
}

/** THe home route **/
app.get('/', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/index.html'));
});

/** Reservations route */
app.get('/reservation', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/reservation.html'));
});
app.get('/productlist', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/allproducts.html'));
});
app.get('/Inventoryinput', sessionChecker, function(req, res) {
    // return res.send('It works');
    return res.sendFile(path.join(__dirname + '/views/Inventoryinput.html'));
});


/** Inventry input route, page gets call when form is submitted */
app.post('/Inventoryinput', sessionChecker, function(req, res) {
    var productId = parseInt(req.body.product_id);
    var quantityRestock = req.body.qty_restock || 0;
    var quantityDeplete = req.body.qty_deplete || 0;
    var sqlQuery;
    var productQuantity;


    /* Set operation as 'Remove ' or Add */
    var operation = quantityDeplete > quantityRestock ? 'REMOVE' : 'ADD';

    /** Run query against the Database */
    return connection.query(`SELECT StockQuantity from Products WHERE ItemId = "${productId}"`, function(err, result) {
        if (err) throw err
        console.log(result)
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
                throw error
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



app.get('/index', sessionChecker, function(req, res) {
    return res.sendFile(path.join(__dirname + '/views/index.html'));
});


/** Query DB, return the data and try to build the page html pull appts from DB using query string*/
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


/* Send the registation info to the server */
app.post('/register', (req, res) => {
    User.create(req.body).then(user => {
        res.send(user)
    }).catch(err => res.send(err));
});
//if pswd successful go to index; if not stay on login
app.post('/login', (req, res) => {
    console.log(req.body)
    User.findOne({ username: req.body.username, password: req.body.password }, function(err, user) {
        console.log(user)
        if (err || !user) {
            return res.sendFile(path.join(__dirname + '/views/login.html'));
        } else {
            req.session.user = user;
            return res.sendFile(path.join(__dirname + '/views/index.html'));
        }
    });
});

/** Clear the cookie  then the user's session is not valid*/
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
    }
    res.redirect('/login');
});

/** Listen to port and serve app */
app.listen(PORT, function() {
    console.log('App is running on PORT ' + PORT);
})