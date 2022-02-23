const passport = require('passport');
// const jwt = require('./jwtStrategy');
const local = require('./localStrategy');
const kakao = require('./kakaoStrategy');
// const users = require('../models/users');

module.exports = () => {
  passport.serializeUser((user, done) => {
    done(null, user.id); // 세션에 유저의 id를 저장.
  });

  passport.deserializeUser((user, done) => {
    users.findone({ where: { id } })
      .then(user => done(null, user))
      .catch(err => done(err));
  });
  // 나중에 유저의 정보를 달라고 하면 디시리얼라이즈로 다시 살려냄

  // jwt();
  local();
  // kakao();
};
