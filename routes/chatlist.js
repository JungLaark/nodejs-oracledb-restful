const express = require("express");
const route = express.Router();
const bodyParser = require("body-parser");
const oracledb = require("oracledb");
const logger = require("../Helper/LogHelper");
const config = require('../Helper/Config');
const app = express();

route.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

//대화방 목록 사용자 아이디 별 
//전화번호 추가 
route.get('/',
      async (req, res) => {

        console.log("/chatlist get 입장");
        logger.debug("/chatlist get 입장");

        let connection;

        try{
          let result, sql, binds, options;

          sql = `
          SELECT CONTACT,
                 TO_CHAR(LAST_DATE, 'YYYY-MM-DD HH24:MI:SS') AS LAST_DATE,
                (SELECT WORD
                    FROM ALI_STT_RESULT_TBL
                    WHERE ID = LAST_ID) LAST_WORD,
                 PHONE_NUMBER
          FROM (SELECT NVL((SELECT NAME 
                        FROM ALI_CONTACT_TBL 
                       WHERE REPLACE(PHONE_NUM, '-', '') = A.PHONE_NUMBER), A.PHONE_NUMBER) CONTACT,
                      MAX(A.CALL_DATE) LAST_DATE,
                      MAX(B.ID) LAST_ID,
                      A.PHONE_NUMBER
                FROM ALI_CALL_LIST_TBL A,	ALI_STT_RESULT_TBL B
                WHERE A.FILE_KEY = B.FILE_KEY
                AND A.USER_ID = :1
                GROUP BY PHONE_NUMBER)
          `;

          binds = [
            req.query.userid
          ];

          options = {
              autoCommit: true
          }

          connection = await oracledb.getConnection(config.dbconnection);
          result = await connection.execute(sql, binds, options);

          console.log("selected rows: " + result.rows);

          if(result.rows != null){
            res.status(200).send({'message' : 'Success Selected!',
                                'result' : result.rows});
          }else{
            res.status(204).send({});
          }

        }catch(err){
          logger.error("/chatlist get 에서 오류가 났어요 : " + err);
          console.error("/chatlist get 에서 오류가 났어요 : " + err);
          return;
        }finally{
          if (connection) {
            try {
              await connection.close();
              return;
            } catch (err) {
              logger.error("/chatlist finally 에서 오류가 났어요 : " + err);
              console.error("/chatlist finally 에서 오류가 났어요 : " + err);
              return;
            }
          }
        }
      
      });


module.exports = route;
