const express = require('express');
const mysql = require('mysql');
const dbconfig = require('../config/database');
const { verifyToken } = require('./middleware');

const connection = mysql.createConnection(dbconfig);
const router = express.Router();

router.post('/', verifyToken, (req, res) => {
  console.log(req.decoded, 1);
  console.log(req.body, 1);
  const { content, subjectId } = req.body;
  const { userInfo } = req.decoded;
  console.log(typeof parseInt(subjectId, 10));
  try {
    const insertsql = `INSERT INTO todos(content, subject_id, user_id) VALUES("${content}", ${parseInt(subjectId, 10)}, ${userInfo.id})`;
    connection.query(insertsql, (insertErr, result, fields) => {
      console.log(result);
      if (insertErr) throw insertErr;
      res.json({
        todo: {
          id: result.insertId,
          content,
          subjectId: parseInt(subjectId, 10),
          userId: userInfo.id,
          isDone: false,
        },
      });
    });
  } catch (error) {
    return res.json({ error });
  }
});

// todo 이미 있는 내용은 추가로 생성하지 않게 해야할까? 같은 것이 들어가면 안되는 이유도 없으니 그냥 유저가 알아서 지우게 하는게 나을 듯

router.patch('/todoId', verifyToken, (req, res) => {
  const { content, isDone } = req.body;
  const { userInfo } = req.decoded;
  const { todoId } = req.params;
  console.log(todoId)
  try {
    const findsql = `SELECT * FROM todos WHERE id = "${parseInt(todoId, 10)}";`;
    connection.query(findsql, (finderr, row) => {
      if (row.lenth === 0 || userInfo.id === row.shift().id) {
        res.json({ message: 'Invalid user' });
      } else {
        const oldTodo = row.shift();
        const updatesql = `UPDATE todos SET content = "${content}", isDone = "${isDone}") WHERE id = ${todoId})`;
        try {
          connection.query(updatesql, (updateErr, result, fields) => {
            if (updateErr) throw updateErr;
            res.json({
              todo: {
                id: result.insertId,
                content,
                subjectId: oldTodo.subjectId,
                userId: userInfo.id,
                isDone: false,
              },
            });
          });
        } catch (error) {
          return res.json({ message: error });
        }
      }
    });
  } catch (error) {
    return res.json({ error });
  }
});

// router.patch('/:todosId', verifyToken, (req, res) => {
//   const { content, isDone } = req.body;
//   const { userInfo } = req.decoded;
//   const { todoId } = req.params;
//   console.log(todoId)
//   try {
//     const findsql = `SELECT * FROM todos WHERE id = ${parseInt(todoId, 10)};`;
//     connection.query(findsql, (finderr, row) => {
//       if (row.lenth === 0) {
//         res.json({ message: 'Invalid request' });
//       } else {
//         const oldTodo = row.shift();
//         const updatesql = `UPDATE todos SET content = "${content}", isDone = "${isDone}") WHERE id = ${todoId})`;
//         try {
//           connection.query(updatesql, (updateErr, result, fields) => {
//             if (updateErr) throw updateErr;
//             res.json({
//               todo: {
//                 id: result.insertId,
//                 content,
//                 subjectId: oldTodo.subjectId,
//                 userId: userInfo.id,
//                 isDone: false,
//               },
//             });
//           });
//         } catch (error) {
//           return res.json({ message: error });
//         }
//       }
//     });
//   } catch (err) {
//     return res.json({ message: 'Failed to reach data', err });
//   }
// });

module.exports = router;
