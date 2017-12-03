/** Send request to the server simulating a ping so connection does not close */
module.exports = function(conn) {
    return conn.query('SELECT * from Products', function (err, response) {
        console.log('Pinging DB', response);
    });
}