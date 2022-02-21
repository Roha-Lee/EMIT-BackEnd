const morgan = require('morgan');
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const dbconfig = require('./config/database');
const todosRouter = require('./routes/todos');
const authRouter = require('./routes/auth');

dotenv.config();

const { verifyToken } = require('./routes/middleware');

const connection = mysql.createConnection(dbconfig);
// const jwt = require('./modules/jwt');
const app = express();

const corsOptions = {
  // origin: 'http://143.248.196.35:3000',
  origin: 'http://localhost:3000',
  // origin: '*',
  credentials: true,
};

app.set('port', process.env.PORT || 5000);
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(process.env.COOKEY_SECRET_KEY));

app.use('/todos', todosRouter);
app.use('/auth', authRouter);

app.get('/', verifyToken, (req, res) => {
  const { userInfo } = req.decoded;
  // console.log(userInfo);
  if (!userInfo) {
    res.json({ message: 'No token' });
  }
  try {
    connection.query(`SELECT token FROM users WHERE username = "${userInfo.username}";`, async (error, row) => {
      if (row) {
        // res.redirect('/main');
        res.status(200).json({ message: 'success' });
      }
    });
  } catch (error) {
    res.json({ message: 'Fail to find user' });
  }
  // res.json('Root page!');
});

app.get('/mainpage', verifyToken, (req, res) => {
  console.log(req.headers);
  res.json({ message: 'main page' });
});

app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

app.listen(app.get('port'), () => {
  console.log(`Express server listening on port ${app.get('port')}`);
});
