const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const { ExtractJwt, Strategy: JWTStrategy } = require('passport-jwt');
const { isLoggedIn, isNotLoggedIn } = require('./middleware');

const JWTConfig = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY,
};
const dbconfig = require('../config/database');

const connection = mysql.createConnection(dbconfig);
// const users = require('../models/users');

const router = express.Router();
const JWTVerify = async (jwtPayload, done) => {
  try {
    // jwtPayload에 유저 정보가 담겨있다.
		// 해당 정보로 유저 식별 로직을 거친다.
    
    // 유효한 유저라면
    if (user) {
      done(null, user);
      return;
    }
    // 유저가 유효하지 않다면
    done(null, false, { message: 'inaccurate token.' });
  } catch (error) {
    console.error(error);
    done(error);
  }
};

// passport.use('jwt', new JWTStrategy(JWTConfig, JWTVerify));

router.post('/join', isNotLoggedIn, async (req, res, next) => {
  const {
    name, pw, nickname, email,
  } = req.body;
  try {
    const exUser = await connection.query(`SELECT id FROM users WHERE username = "${name}"`);
    if (exUser) {
      return res.json('User already exists');
      // return res.redirect('/join?error=exist');
    }
    const hash = await bcrypt.hash(pw, 12);
    await connection.query('INSERT INTO users (username, password, nickname, email) VALUES (?, ?, ?, ?)', [
      name,
      hash,
      nickname,
      email,
    ]);
    return res.json('Sign up success');
    // return res.redirect('/');
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

router.post('/login', isNotLoggedIn, (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) {
      console.error(authError);
      return next(authError); // 서버에러
    }
    if (!user) {
      return res.json(info); // 로그인 실패
      // return res.redirect(`/?loginError=${info.message}`);
    }
    return req.login(user, (loginError) => { // 로그인에 성공 -> passportindex로
      if (loginError) {
        console.error(loginError);
        return next(loginError);
      }
      // 세션 쿠키가 생성되어 브라우저에 저장.
      // const token = jwt.sign(user, process.env.JWT_SECRET_KEY);
      // return res.json(token);
      return res.json('Login success');
      // return res.redirect('/'); // 로그인 성공
    });
  })(req, res, next);
});

router.get('/logout', isLoggedIn, (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});


// app.get('/logout', verifyToken, (req, res) => {
//   req.logOut();
//   req.session.destroy();
//   res.redirect('/');
// });
// app.get('/refreshToken', verifyToken, (req, res) => {
//   if (req.headers.authorization && req.headers.refresh) {
//     const authToken = req.headers.authorization.split('Bearer ')[1];
//     const refreshToken = req.headers.refresh;
//     // access token 검증 -> expired여야 함.
//     const authResult = jwt.verifyToken(authToken);
//     // access token 디코딩하여 user의 정보를 가져옵니다.
//     const decoded = jwt.decode(authToken);
//     // 디코딩 결과가 없으면 권한이 없음을 응답.
//     if (decoded === null) {
//       res.status(401).send({
//         ok: false,
//         message: 'No authorized!',
//       });
//     }
//     /* access token의 decoding 된 값에서
//       유저의 id를 가져와 refresh token을 검증합니다. */
//     const refreshResult = jwt.verifyToken(refreshToken, decoded.id);
//     // 재발급을 위해서는 access token이 만료되어 있어야합니다.
//     if (authResult.ok === false && authResult.message === 'jwt expired') {
//       // 1. access token이 만료되고, refresh token도 만료 된 경우 => 새로 로그인해야합니다.
//       if (refreshResult.ok === false) {
//         res.status(401).send({
//           ok: false,
//           message: 'No authorized!',
//         });
//       } else {
//         // 2. access token이 만료되고, refresh token은 만료되지 않은 경우 => 새로운 access token을 발급
//         const newAccessToken = sign(user);
//         res.status(200).send({ // 새로 발급한 access token과 원래 있던 refresh token 모두 클라이언트에게 반환합니다.
//           ok: true,
//           data: {
//             accessToken: newAccessToken,
//             refreshToken,
//           },
//         });
//       }
//     } else {
//       // 3. access token이 만료되지 않은경우 => refresh 할 필요가 없습니다.
//       res.status(400).send({
//         ok: false,
//         message: 'Acess token is not expired!',
//       });
//     }
//   } else { // access token 또는 refresh token이 헤더에 없는 경우
//     res.status(400).send({
//       ok: false,
//       message: 'Access token and refresh token are need for refresh!',
//     });
//   }
// });