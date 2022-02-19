const express = require('express');
const mysql = require('mysql');

const connection = mysql.createConnection();
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('../modules/jwt');

router.get('/logout', (req, res) => {
  res.clearCookie('x_auth').json({ logoutSuccess: true });
});

router.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  try {
    // console.log(req.body.id);
    await connection.query(`SELECT * FROM users WHERE username = "${username}";`, async (error, row) => {
      if (error) throw error;
      // console.log(row);
      const User = row.shift();
      if (User === undefined) {
        res.json({ message: 'Invalid id' });
      } else {
        const result = await bcrypt.compare(password, User.password);
        if (!result) {
          res.json({ message: 'Invalid password' });
        } else {
          const jwtToken = jwt.sign(User);
          await connection.query(`INSERT INTO users (token) VALUES (${jwtToken.refreshToken});`);
          res.status(200).json({ statusCode: 200, message: 'success', token: (await jwtToken).accessToken });
        }
      }
    });
  } catch (e) {
    res.json({ message: 'failed to login' });
  }
});

router.post('/signup', (req, res, next) => {
  const {
    username, password, nickname, email,
  } = req.body;
  const regExp = /^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i;
  if (!username) return res.json({ message: 'Empty IDfield' });
  if (username.length > 16) return res.json({ message: 'Too long id' });
  if (password.length < 4) return res.json({ message: 'Invalid password' });
  if (!nickname) return res.json({ message: 'Empty nickname' });
  if (!regExp.test(email)) return res.json({ message: 'Invalid email' });
  try {
    connection.query(`SELECT * FROM users WHERE username = "${username}"`, async (error, exUser) => {
      if (error) throw (error);
      if (!exUser) {
        return res.json({ message: 'connection error' });
      }
      if (exUser.length !== 0) {
        return res.json({ message: 'Existing user' });
      }
      const hashpw = await bcrypt.hash(password, 12);
      console.log(req.body);
      connection.query('INSERT INTO users (username, password, created_at, nickname, email) VALUES (?, ?, NOW(), ?, ?)', [
        username,
        hashpw,
        nickname,
        email,
      ]);
      return res.json({ message: 'success' });
    });
  } catch (error) {
    // console.error(error);
    return next(error);
  }
});

router.get('/refresh', (req, res) => {
  try {
    const headers = req.signedCookies.x_auth;
    // console.log(headers.fresh)
    // console.log(headers);
    try {
      const oldToken = jwt.verify(headers.accessToken, process.env.JWT_SECRET_KEY);
      // console.log(oldToken);
      res.redirect('/main');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const refreshToken = jwt.verify(headers.refreshToken, process.env.JWT_SECRET_KEY);
        // console.log(refreshToken.userInfo.username)
        connection.query(`SELECT id, username FROM users WHERE username = "${refreshToken.userInfo.username}"`, (error, row) => {
          const User = row.shift();
          // console.log(User);
          if (User.username === refreshToken.userInfo.username) {
            const userInfo = {
              id: User.id,
              username: User.username,
            };
            const freshRefreshToken = jwt.sign({ userInfo }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
            const accessToken = jwt.sign({ userInfo }, process.env.JWT_SECRET_KEY, { expiresIn: '3d' });
            res.cookie('x_auth', { accessToken, freshRefreshToken }, { signed: true }).redirect('/main');
          }
        });
      }
    }
  } catch (error) {
    // console.log(error)
    res.json({ message: 'fail to get cookies', error });
  }
});
