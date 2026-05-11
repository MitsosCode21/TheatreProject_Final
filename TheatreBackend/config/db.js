const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost', 
    port: 3307, 
    user: 'root', 
    password: '12345', 
    database: 'theatre_app',
    connectionLimit: 5
});

module.exports = pool;