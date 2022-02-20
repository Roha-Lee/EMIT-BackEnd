const express = require('express');
const mysql = require('mysql');
// const mysql = require('mysql2/promise');
const { verifyToken } = require('./middleware');

const dbconfig = require('../config/database');

// const pool = mysql.createPool(dbconfig);
const router = express.Router();
const connection = mysql.createConnection(dbconfig);

router.get('/daily', verifyToken, async (req, res) => {
  const { userInfo } = req.decoded;
  const { today } = req.body;
  try {
    const sql = `SELECT sd.subject_id, 
    sd.start_time, 
    sd.updated_at, 
    s.name,
    c.code 
    FROM study_durations AS sd
    JOIN subjects AS s 
    ON sd.subject_id = s.id
    JOIN colors AS c
    ON c.id = s.color_code_id 
    WHERE sd.user_id = ${parseInt(userInfo.id, 10)}
    AND (date_format(sd.updated_at, "%Y-%m-%d") = STR_TO_DATE("${today}", "%Y-%m-%d") 
    OR date_format(sd.start_time, "%Y-%m-%d") = STR_TO_DATE("${today}", "%Y-%m-%d"));`;
    const todayStart = new Date(`${today.substr(0, 10)} GMT+0900`);
    const todayEnd = new Date(`${today.substr(0, 10)} 23:59:59 GMT+0900`);
    connection.query(sql, (err, row) => {
      if (err) throw err;
      const studyTimeSummary = row.map((item) => {
        let start = new Date(`${item.start_time} GMT+0900`);
        let end = new Date(`${item.updated_at} GMT+0900`);
        if (start < todayStart) start = todayStart;
        if (end > todayEnd) end = todayEnd;
        return {
          subjectId: item.subject_id,
          subjectName: item.name,
          color: item.code,
          totalTime: end - start,
        };
      })
        .reduce((prev, curr) => {
          const arr = [...prev];
          const idx = prev.findIndex((elem) => elem.subjectId === curr.subjectId);
          if (idx === -1) {
            arr.push({
              subjectId: curr.subjectId,
              subjectName: curr.subjectName,
              color: curr.color,
              totalTime: curr.totalTime,
            });
          } else {
            arr[idx].totalTime += curr.totalTime;
          }
          return arr;
        }, [])
        .map((item) => {
          const time = (item.totalTime / 1000);
          let m = (time / 60);
          const h = (m / 60);
          const s = (time % 60);
          m %= 60;
          return {
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            color: item.color,
            totalTime: `${parseInt(h, 10)}:${parseInt(m, 10)}:${parseInt(s, 10)}`,
          };
        });
      return res.json({ studyTimeSummary });
    });
  } catch (error) {
    return res.json({ error });
  }
});

router.get('/period', verifyToken, async (req, res) => {
  const { userInfo } = req.decoded;
  const { startDate, endDate } = req.body;
  try {
    const sql = `SELECT sd.subject_id, 
      sd.start_time, 
      sd.updated_at, 
      s.name,
      c.code 
      FROM study_durations AS sd
      JOIN subjects AS s 
      ON sd.subject_id = s.id
      JOIN colors AS c
      ON c.id = s.color_code_id 
      JOIN todos AS t
      ON t.
      WHERE sd.user_id = ${parseInt(userInfo.id, 10)}
      AND (date_format(sd.updated_at, "%Y-%m-%d") = STR_TO_DATE("${endDate}", "%Y-%m-%d") 
      OR date_format(sd.start_time, "%Y-%m-%d") = STR_TO_DATE("${startDate}", "%Y-%m-%d"));`;
    await connection.query(sql, async (err, row) => {
      if (err) throw err;
      const studyTimeSummary = row.map((item) => {
        const start = new Date(`${item.start_time} GMT+0900`);
        const end = new Date(`${item.updated_at} GMT+0900`);
        return {
          subjectId: item.subject_id,
          subjectName: item.name,
          color: item.code,
          totalTime: end - start,
        };
      })
        .reduce((prev, curr) => {
          const arr = [...prev];
          const idx = prev.findIndex((elem) => elem.subjectId === curr.subjectId);
          if (idx === -1) {
            arr.push({
              subjectId: curr.subjectId,
              subjectName: curr.subjectName,
              color: curr.color,
              totalTime: curr.totalTime,
            });
          } else {
            arr[idx].totalTime += curr.totalTime;
          }
          return arr;
        }, [])
        .map((item) => {
          const time = (item.totalTime / 1000);
          let m = (time / 60);
          const h = (m / 60);
          const s = (time % 60);
          m %= 60;
          return {
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            color: item.color,
            totalTime: `${parseInt(h, 10)}:${parseInt(m, 10)}:${parseInt(s, 10)}`}
        });
      return res.json({ studyTimeSummary });
    });
  } catch (error) {
    return res.json({ error });
  }
});

module.exports = router;
