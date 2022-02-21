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
    const todayStart = new Date(`${today} GMT+0900`);
    const todayEnd = new Date(new Date(`${today} GMT+0900`).setHours(24, 0, 0, 0));
    // console.log(todayStart, todayEnd);
    connection.query(sql, (err, row) => {
      if (err) throw err;
      const rangeTime = row.map((item) => ({
        subjectId: item.subject_id,
        subjectName: item.name,
        color: item.code,
        startTime: `${item.start_time.getFullYear()}-${(item.start_time.getMonth() + 1).toString().padStart(2, '0')}-${item.start_time.getDate().toString().padStart(2, '0')} ${item.start_time.getHours().toString().padStart(2, '0')}:${item.start_time.getMinutes().toString().padStart(2, '0')}:${item.start_time.getSeconds().toString().padStart(2, '0')}`,
        endTime: `${item.updated_at.getFullYear()}-${(item.updated_at.getMonth() + 1).toString().padStart(2, '0')}-${item.updated_at.getDate().toString().padStart(2, '0')} ${item.updated_at.getHours().toString().padStart(2, '0')}:${item.updated_at.getMinutes().toString().padStart(2, '0')}:${item.updated_at.getSeconds().toString().padStart(2, '0')}`,
      }));
      // console.log(rangeTime)
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
          const time = new Date(item.totalTime);
          return {
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            color: item.color,
            totalTime: `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`,
          };
        });
      return res.json({ rangeTime, studyTimeSummary });
    });
  } catch (error) {
    return res.json({ error });
  }
});

router.get('/period', verifyToken, async (req, res) => {
  const { userInfo } = req.decoded;
  let { startDate, endDate } = req.body;
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
    AND ((sd.start_time > STR_TO_DATE("${startDate}", "%Y-%m-%d") OR sd.start_time < STR_TO_DATE("${endDate}", "%Y-%m-%d"))
    OR (sd.updated_at > STR_TO_DATE("${startDate}", "%Y-%m-%d") OR sd.updated_at < STR_TO_DATE("${endDate}", "%Y-%m-%d")));`;
    startDate = new Date(`${req.body.startDate} GMT+0900`);
    endDate = new Date(new Date(`${req.body.endDate} GMT+0900`).setHours(24, 0, 0, 0));
    await connection.query(sql, async (err, row) => {
      if (err) throw err;
      const studyTimeSummary = row.flatMap((item) => {
        let start = new Date(`${item.start_time} GMT+0900`);
        let end = new Date(`${item.updated_at} GMT+0900`);
        if (start < startDate) {
          start = new Date(`${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()} GMT+0900`);
        }
        if (end > endDate) {
          end = new Date(`${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDate.getDate()} GMT+0900`);
        }
        const dayEnd = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate() + 1}`;
        const key = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
        if (end > new Date(dayEnd)) {
          return [{
            color: item.code,
            subjectName: item.name,
            subjectId: item.subject_id,
            totalTime: new Date(`${dayEnd} GMT+0900`) - start,
            key,
          }, {
            subjectId: item.subject_id,
            subjectName: item.name,
            color: item.code,
            totalTime: end - new Date(`${dayEnd} GMT+0900`),
            key: dayEnd,
          },
          ];
        }
        return [{
          subjectId: item.subject_id,
          subjectName: item.name,
          color: item.code,
          totalTime: end - start,
          key,
        }];
      })
        .reduce((prev, curr) => {
          const arr = [...prev];
          const idx = prev.findIndex(([elem]) => elem.key === curr.key);
          const something = {
            key: curr.key,
            subjectName: curr.subjectName,
            totalTime: curr.totalTime,
            color: curr.color,
          };
          if (idx === -1) {
            arr.push([something]);
          } else {
            const iidx = arr[idx].findIndex((elem) => elem.subjectName === curr.subjectName)
            if (iidx === -1) {
              arr[idx].push(something);
            } else {
              arr[idx][iidx].totalTime += curr.totalTime;
            }
          }
          return arr;
        }, []);
      const result = {};
      studyTimeSummary.forEach((date) => {
        date.forEach((subject) => {
          if (result[subject.key] === undefined) {
            result[subject.key] = {};
          }
          result[subject.key][subject.subjectName] = {
            color: `#${subject.color}`,
            totalTime: subject.totalTime,
          };
        });
      });
      console.log(result);
      // const todoQuery = `SELECT s.name, s.color_code_id, t.is_done t.created_at
      // FROM todos AS t
      // JOIN subjects As s ON t.subject_id = s.id
      // WHERE t.created_at BETWEEN ${startDate} AND ${endDate}`
      // connection.query(todoQuery, async (err, row) => {
      //   await console.log(row)
      //   row.forEach(subject) => {
      //     if (result[subject.date] === undefined) {
      //       todoQuery[subject.date] = {}
      //     }
      //     todoQuery[subject.date] = {
      //       color: subject.code
      //     }
      //     todoQuery()
      //   }
      // })
      return res.json({ subjectTotalTime: result });
    });
  } catch (error) {
    return res.json({ error });
  }
});

module.exports = router;
