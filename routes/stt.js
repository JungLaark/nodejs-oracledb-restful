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

//전화번호 별 STT RESULT 뿌려주기 
route.get('/',
      async (req, res) => {

        console.log("/stt get 입장");
        logger.debug("/stt get 입장");

        let connection;

        try{
          let result, sql, binds, options;

          sql = `
                SELECT A.CALL_DATE,
                       B.WORD,
                       WORD_START,
                       WORD_LENGTH,
                       SPEAKER
                FROM ALI_CALL_LIST_TBL A, ALI_STT_RESULT_TBL B 
                WHERE A.FILE_KEY = B.FILE_KEY 
                AND A.PHONE_NUMBER = :1  
               ORDER BY A.CALL_DATE, WORD_START
          `;

          binds = [
            req.query.phonenumber
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
          logger.error("/stt get 에서 오류가 났어요 : " + err);
          console.error("/stt get 에서 오류가 났어요 : " + err);
          return;
        }finally{
          if (connection) {
            try {
              await connection.close();
              return;
            } catch (err) {
              logger.error("/stt finally 에서 오류가 났어요 : " + err);
              console.error("/stt finally 에서 오류가 났어요 : " + err);
              return;
            }
          }
        }
      
      });


module.exports = route;
