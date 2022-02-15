const express = require('express');
const mysql = require('mysql');
const { verifyToken } = require('./middleware');

const dbconfig = require('../config/database');

const router = express.Router();
const connection = mysql.createConnection(dbconfig);

router.post('/', verifyToken, (req, res) => {
  // console.log(req.decoded, 1);
  // console.log(req.body, 1);
  const { , subjectId } = req.body;
  const { userInfo } = req.decoded;
  // console.log(typeof parseInt(subjectId, 10));
  try {
    const insertsql = `SELECT * FROM study_durations WHERE = "${start_time}"`;
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

function generateStudyTimeSummary(databaseRows) {
  databaseRows = [
      {
          subject_id: '1',
          start_time: '2022-02-09 21:00:00',
          updated_at: '2022-02-09 23:00:00',
      },
      {
          subject_id: '2',
          start_time: '2022-02-09 21:00:00',
          updated_at: '2022-02-09 23:00:00',
      },
      {
          subject_id: '1',
          start_time: '2022-02-09 12:00:32',
          updated_at: '2022-02-09 14:00:01',
      },
      {
          subject_id: '3',
          start_time: '2022-02-09 21:02:44',
          updated_at: '2022-02-09 23:10:21',
      },
      {
          subject_id: '1',
          start_time: '2022-02-09 23:40:00',
          updated_at: '2022-02-10 00:20:30',
      },
      {
          subject_id: '1',
          start_time: '2022-02-08 23:40:00',
          updated_at: '2022-02-09 00:20:30',
      },
      {
          subject_id: '3',
          start_time: '2022-02-09 21:00:00',
          updated_at: '2022-02-09 23:00:00',
      },
      {
          subject_id: '1',
          start_time: '2022-02-09 14:01:00',
          updated_at: '2022-02-09 14:20:00',
    },
  ];

  const studyTimeSummary = databaseRows.map((item) => {
    let startTime = new Date(`${item.start_time} GMT+0900`);
    let updatedAt = new Date(`${item.updated_at} GMT+0900`);
    return {
      subjectId: item.subject_id,
      totalTime: updatedAt - startTime,
    };
  })
    .reduce((prev, curr) => {
      const next = [...prev];
      const idx = prev.findIndex((elem) => elem.subjectId === curr.subjectId)
      if (idx === -1) {
        next.push({
          subjectId: curr.subjectId,
          totalTime: curr.totalTime,
        });
      } else {
        next[idx].totalTime += curr.totalTime;
      }
      return next();
    }, []);
  return studyTimeSummary;
}
