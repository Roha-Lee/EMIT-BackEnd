const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const dbconfig = require('../config/database');

const connection = mysql.createConnection(dbconfig);

// const User = require('../models/user');

module.exports = () => {
  passport.use(new LocalStrategy({
    usernameField: 'id', // req.body.id
    passwordField: 'pw', // req.body.pw
  }, async (id, pw, done) => {
    try {
      const name = id;
      const exUser = await connection.query(`SELECT * FROM users WHERE username = "${name}"`);
      console.log(exUser.shift().password);
      if (exUser) {
        const result = await bcrypt.compare(pw, exUser.shift().password);
        if (result) {
          done(null, exUser);
        } else {
          done(null, false, { message: 'Unvalid password' });
        }
      } else {
        done(null, false, { message: 'Unvalid id' });
      }
    } catch (error) {
      console.error(error);
      done(error);
    }
  }));
};
