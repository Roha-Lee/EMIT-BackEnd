const morgan = require('morgan');
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
// const cookieParser = require('express.')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const dbconfig = require('./config/database');
const todosRouter = require('./routes/todos');

dotenv.config();

const { verifyToken } = require('./routes/middleware');

const connection = mysql.createConnection(dbconfig);
const app = express();

const corsOptions = {
  origin: 'http://143.248.196.35:3000',
  credentials: true,
};

app.set('port', process.env.PORT || 3001);

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(process.env.COOKEY_SECRET_KEY));
// app.set('trust porxy', 1);
// app.use(express.cookieParser(process.env.COOKEY_SECRET_KEY));

app.use('/todos', todosRouter);

app.get('/logout', (req, res) => {
  res.clearCookie('x_auth').json({ logoutSuccess: true });
});

app.get('/', verifyToken, (req, res) => {
  const { userInfo } = req.decoded;
  // console.log(userInfo);
  if (!userInfo) {
    res.status(200).json({ message: 'No user info' });
  }
  try {
    connection.query(`SELECT id, username FROM users WHERE username = "${userInfo.username}";`, async (error, row) => {
      if (row) {
        res.redirect('/main');
        // res.json({ message: 'User Logged in' });
      }
    });
  } catch (error) {
    res.status(200).json({ message: 'Fail to find user' });
  }
  // res.json('Root page!');
});

app.get('/main', verifyToken, (req, res) => {
  res.json({ message: 'main page' });
});

app.post('/signin', async (req, res, next) => {
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
          const userInfo = {
            id: User.id,
            username: User.username,
          };
          // console.log(User);
          // const accessToken = jwt.sign({ userInfo }, process.env.JWT_SECRET_KEY, { expiresIn: '5s' });
          const accessToken = jwt.sign({ userInfo }, process.env.JWT_SECRET_KEY, { expiresIn: '3h' });
          const refreshToken = jwt.sign({ userInfo }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
          return res.cookie('x_auth', { accessToken, refreshToken }, { signed: true }).send(accessToken);
        }
      }
    });
  } catch (e) {
    next();
  }
});

app.post('/signup', async (req, res, next) => {
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
      res.json({ message: 'success' });
    });
  } catch (error) {
    // console.error(error);
    return next(error);
  }
});

app.get('/refresh', (req, res) => {
  try {
    const headers = req.cookies.x_auth;
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
            const accessToken = jwt.sign({ userInfo }, process.env.JWT_SECRET_KEY, { expiresIn: '3s' });
            res.cookie('x_auth', { accessToken, freshRefreshToken }).redirect('/main');
          }
        });
      }
    }
  } catch (error) {
    // console.log(error)
    res.json({ message: 'fail to get cookies', error });
  }
});

app.listen(app.get('port'), () => {
  console.log(`Express server listening on port ${app.get('port')}`);
});
