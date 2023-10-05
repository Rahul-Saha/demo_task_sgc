const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'sgcdb',
  password: 'sgcdb',
  database: 'sgc_demo_db',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
  console.log('Connected to MySQL database');
});

module.exports = db;