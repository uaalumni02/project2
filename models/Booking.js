var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var bookingSchema = new Schema({
    name: String,
    date: String,
});

module.exports = mongoose.model('Booking', bookingSchema);