const express = require('express');
const mysql = require('mysql');
const { verifyToken } = require('./middleware');

const dbconfig = require('../config/database');

const router = express.Router();
const connection = mysql.createConnection(dbconfig);

router.get('/daily', verifyToken, (req, res) => {
  // const { userInfo } = req.decoded;
  const { today } = req.body;
  try {
    const sql = `SELECT study_durations.subject_id, 
    study_durations.start_time, 
    study_durations.updated_at, 
    subjects.name,
    colors.code 
    FROM study_durations 
    JOIN subjects 
    ON study_durations.subject_id = subjects.id
    JOIN colors 
    ON colors.id = subjects.color_code_id 
    WHERE study_durations.start_time >= STR_TO_DATE("${today}", "%Y-%m-%d") 
    AND study_durations.updated_at < DATE_ADD(STR_TO_DATE("${today}", "%Y-%m-%d"), INTERVAL 1 day);`;
    connection.query(sql, (err, row) => {
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
        }, []);
      return res.json({ studyTimeSummary });
    });
  } catch (error) {
    return res.json({ error });
  }
});

router.get('/period', verifyToken, (req, res) => {
  const { userInfo } = req.decoded;
  const { startTime, endTime } = req.body;
  try {
    const sql = `SELECT study_durations.subject_id, 
    study_durations.start_time, 
    study_durations.updated_at, 
    study_durations.user_id, 
    colors.color_code
    FROM study_durations
    JOIN subjects
    JOIN colors
    ON subjects.user_id = "${userInfo.id}"
    WHERE study_duration.start_time 
    BETWEEN STR_TO_DATE("${startTime}", "%Y-%m-%d")
    AND  STR_TO_DATE("${endTime}", "%Y-%m-%d");`;
    connection.query(sql, (err, row) => {
      if (err) throw err;
      // console.log(row);
      const { result } = row.shift();
      const databaseRows = {
        subjectId: result.subject_id,
        subjectName: result.subject_name,
        color: result.color_code,
        startTime: result.start_time,
        endTime: result.updated_at,
      };
      const studyTimeSummary = databaseRows.map((item) => {
        const start = new Date(`${item.start_time} GMT+0900`);
        const end = new Date(`${item.updated_at} GMT+0900`);
        return {
          subjectId: item.subject_id,
          subjectName: item.subject_name,
          color: item.color_code,
          totalTime: end - start,
        };
      })
        .reduce((prev, curr) => {
          const next = [...prev];
          const idx = prev.findIndex((elem) => elem.subjectId === curr.subjectId);
          if (idx === -1) {
            next.push({
              subjectId: curr.subjectId,
              subjectName: curr.subject_name,
              color: curr.color_code,
              totalTime: curr.totalTime,
            });
          } else {
            next[idx].totalTime += curr.totalTime;
          }
          return next();
        }, []);
      return res.json({ studyTimeSummary });
    });
  } catch (error) {
    return res.json({ error });
  }
});

module.exports = router;
