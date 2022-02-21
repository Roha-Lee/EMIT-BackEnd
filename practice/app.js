const morgan = require('morgan');
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const dbconfig = require('./config/database');
const todosRouter = require('./routes/todos');
const statisticsRouter = require('./routes/statistics');
const authRouter = require('./routes/auth');
const pageRouter = require('./routes/page')
// const fs = require('fs');

dotenv.config();

// const { v4: uuidV4 } = require('uuid');
const { verifyToken } = require('./routes/middleware');

const connection = mysql.createConnection(dbconfig);
// const jwt = require('./modules/jwt');
const app = express();

const corsOptions = {
  origin: '*',
  credentials: true,
};

app.set('port', process.env.PORT || 3001);
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(process.env.COOKEY_SECRET_KEY));

app.use('/', pageRouter);
app.use('/todos', todosRouter);
app.use('/statistics', statisticsRouter);
app.use('/auth', authRouter);

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// const options = { // letsencrypt로 받은 인증서 경로를 입력
//   ca: fs.readFileSync('/etc/letsencrypt/live/mait.shop/fullchain.pem'),
//   key: fs.readFileSync('/etc/letsencrypt/live/mait.shop/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/mait.shop/cert.pem')
//   };

app.get('/logout', (req, res) => {
  res.clearCookie('x_auth').json({ logoutSuccess: true });
});

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
