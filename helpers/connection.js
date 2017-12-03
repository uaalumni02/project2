const mysql = require('mysql');
module.exports = function(parameters) {
    var connection = mysql.createConnection(parameters);
    connection.on('error', function(err) {
        console.log('Connection Error ' + err);
    });
    return connection;
}