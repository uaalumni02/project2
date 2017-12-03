const mysql = require('mysql');
module.exports = function() {
    var connection = mysql.createConnection({
        host: 'us-cdbr-iron-east-05.cleardb.net',
        user: 'b780db20a8b3da',
        password: '04b718ae',
        database: 'heroku_517e0a0ae32c3ab'
    });
    connection.on('error', function(err) {
        console.log('Connection Error ' + err);
        console.log('Reconnecting -----')
        connection = mysql.createConnection({
            host: 'us-cdbr-iron-east-05.cleardb.net',
            user: 'b780db20a8b3da',
            password: '04b718ae',
            database: 'heroku_517e0a0ae32c3ab'
        });
        return connection;
    });
    return connection;
}