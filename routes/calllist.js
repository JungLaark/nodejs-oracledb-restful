const express = require("express");
const route = express.Router();
const bodyParser = require("body-parser");
const oracledb = require("oracledb");
const logger = require("../Helper/LogHelper");
const config = require('../Helper/Config');

route.use(bodyParser.urlencoded({ extended: true }));

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

//통화 목록 조회

route.get("/searchcallist", async (req, res) => {
  console.log("/calllist/search 입장");
  logger.debug("/calllist/search 입장");

  let connection;
  let returnCode;

  try {

    connection = await oracledb.getConnection({
      user: config.dbconnection.user,
      password: config.dbconnection.password,
      connectString: config.dbconnection.connectString,
    });

    const result = await connection.execute(
      `
      SELECT CALL_ID AS ID, 
      PHONE_NUMBER,
      TO_CHAR(CALL_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CALLDATE,
      TO_CHAR(CALL_DATE + DURATION/(24*60*60), 'YYYY-MM-DD HH24:MI:SS') AS ENDDATE,
      DURATION,
      TYPE,
      (SELECT COUNT(1) FROM ALI_WAVFILE_TBL WHERE CREATED_DATE BETWEEN CALL_DATE AND CALL_DATE + DURATION/(24*60*60)) FILE_COUNT 
      FROM ALI_CALL_LIST_TBL
      ORDER BY CALL_DATE
      `
    );

    console.log(result.rows);
    logger.debug("select ALI_CALL_LIST_TBL RESULT : " + result.rows);

    if (result.rows.length > 0) {
      return res
        .status(200)
        .json({ message: "search Success!!!", "result": result.rows });
    } else {
      return res.status(406).json({ message: "Invalid request!!!" });
    }

    //여기서 조회된 row 개수에 따라서 리턴되는 값 변경이 필요할 것이다.
  } catch (err) {
    console.error(err);
    logger.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
        logger.error(err);
      }
    }
  }
  return returnCode;
});

//wav 파일 정보 조회 
//param:callid, userid 추가 
route.get("/searchwav", async (req, res) => {
  const param = req.query.callid;
  const param2 = req.query.userid;

  console.log("/calllist/searchwav 입장, param:" + param + "  param2 : " + param2);
  logger.debug("/calllist/searchwav 입장, param:" + param+ "  param2 : " + param2);

  let connection;
  let returnCode;

  try {
    connection = await oracledb.getConnection({
      user: config.dbconnection.user,
      password: config.dbconnection.password,
      connectString: config.dbconnection.connectString,
      //connectString : "61.32.218.74:1521/XE"
    });

    const result = await connection.execute(
      `
       SELECT FILE_KEY 
       FROM ALI_WAVFILE_TBL 
       WHERE CREATED_DATE 
       BETWEEN (SELECT CALL_DATE FROM ALI_CALL_LIST_TBL WHERE CALL_ID = :param) 
           AND (SELECT CALL_DATE + DURATION/(24*60*60) FROM ALI_CALL_LIST_TBL WHERE CALL_ID = :param ) 
           AND USER_ID = :param2
       `,
      [param, param, param2]
    );``

    console.log(result.rows);
    logger.debug("select ALI_WAVFILE_TBL :" + result.rows);

    if (result.rows.length > 0) {
      return res
        .status(200)
        .json({ message: "search Success!!!", "result": result.rows });
    } else {
      return res.status(406).json({});
    }

    //여기서 조회된 row 개수에 따라서 리턴되는 값 변경이 필요할 것이다.
  } catch (err) {
    console.error(err);
    logger.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
        logger.error(err);
      }
    }
  }
  return returnCode;
});


//음성인식 결과
//param:filekey
route.get("/sttresult", async (req, res) => {
  const param = req.query.id;
  console.log("/calllist/sttresult 입장, id:" + param);
  logger.debug("/calllist/sttresult 입장, id:" + param);

  let connection;
  let returnCode;

  try {
    connection = await oracledb.getConnection({
      user: config.dbconnection.user,
      password: config.dbconnection.password,
      connectString: config.dbconnection.connectString,
    });

    const result = await connection.execute(
       `
        SELECT *
        FROM ALI_STT_RESULT_TBL 
        WHERE FILE_KEY = :fileKey `,
       [param]
    );

    console.log(result.rows);
    logger.debug("select ALI_STT_RESULT_TBL :" + result.rows);

    if (result.rows.length > 0) {
      return res
        .status(200)
        .json({ message: "search Success!!!", "result": result.rows });
    } else {
      return res.status(406).json({ message: "" });
    }

    //여기서 조회된 row 개수에 따라서 리턴되는 값 변경이 필요할 것이다.
  } catch (err) {
    console.error(err);
    logger.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
        logger.error(err);
      }
    }
  }
  return returnCode;
});

module.exports = route;
