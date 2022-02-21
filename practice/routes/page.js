const express = require('express');
const router = express.Router();

router.get('/mainpage', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const user_id = 1;
  const sql_1 = `SELECT
                      s.id,
                      s.name,
                      c.code as color,
                      sd.start_time,
                      sd.updated_at
                  FROM study_durations AS sd 
                  LEFT JOIN subjects AS s 
                      ON sd.subject_id = s.id 
                  LEFT JOIN colors AS c 
                      ON c.id = s.color_code_id 
                  WHERE (sd.user_id = ${user_id}) 
                  AND (DATE_FORMAT(sd.start_time, "%Y-%m-%d") = STR_TO_DATE("${today}", "%Y-%m-%d") 
                  OR DATE_FORMAT(sd.updated_at, "%Y-%m-%d") = STR_TO_DATE("${today}", "%Y-%m-%d"));`;
  const sql_2 = `SELECT 
                      t.content, 
                      t.subject_id, 
                      t.is_done FROM todos AS t 
                  LEFT JOIN users AS u 
                      ON u.id = ${user_id};`
  con.query(sql_1 + sql_2, function(err, result){
      if(err) {
          console.log("Error Execution :", err);
          res.send("ERROR");
          throw err;
      };
      con.end();
      const results ={}
      results.subjects = result[0].map((data) => {
          const {id, name, color} = data;
          let time = ((data["updated_at"]-data["start_time"])/1000);
          return {
              id,
              name,
              color,
              totalTime: time
          }
      }).reduce((prev, curr) => {
          const arr = [...prev];
          const idx = prev.findIndex((elem) => elem.id === curr.id);
          if (idx === -1) {
            arr.push({
              id: curr.id,
              name: curr.name,
              color: curr.color,
              totalTime: curr.totalTime,
            });
          } else {
            arr[idx].totalTime += curr.totalTime;
          }
          return arr;
        }, []);
        results.subjects = results.subjects.map((data) => {
            const { id, name, color } = data;
            let time = data["totalTime"];
            let min = (time/60);
            let hour = (min/60);
            let sec = (time%60);
            min = (min%60);
            return {
              id,
              name,
              color,
              totalTime: `${parseInt(hour)}:${parseInt(min)}:${parseInt(sec)}`
          }
        }) 
      res.send({"subjects" : results.subjects, "todos" : result[1]});
      // con.end();
  });
  // con.end();
});


router.post('/subject', (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  const body = req.body;
  const user_id = 1; // 토큰에서 가져오기!
  const subject_name = body.subject; // request.get.body ?
  const color_code= body.colorCode;
  console.log(body);

  if (color_code == "") {
      res.status(401).send( {message: "NO_COLOR_SELECTED"}) 
  } else if (color_code.length < 6) {
      res.status(401).send( {message: "INVALID_COLOR"} )
  };

  con.query(`SELECT * FROM subjects WHERE user_id = ${user_id} AND name = "${subject_name}"`, function(err, result) {
      if (err) {
          console.log("ERROR Execution: ", err);
          res.send("ERROR");
          throw err;
      }
      console.log("result", result)
      if (result != "") { 
          res.status(401).send( {message: "SUBJECT_EXISTS"} )
      } else {
          const sql = `INSERT INTO subjects(user_id, name, color_code) VALUES (1, "${subject_name}", "${color_code}")`;
          console.log(sql);
          con.query(sql, function(err, result, fields) {
              if(err) throw err;

              db_index = result.insertId;
              console.log(db_index);

              const sub_sql = `SELECT id, name, color_code as colorCode FROM subjects WHERE id = ${db_index}`;
              con.query(sub_sql, function (err, result, fields) {
                  if (err) throw err;
                  console.log(err);
                  res.send(...result)
              })
          })
      }
  });

module.exports = router;
