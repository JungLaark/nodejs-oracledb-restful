const express = require('express');
const route = express.Router();

const logger = require("../Helper/LogHelper");
const config = require('../Helper/Config');

const bodyParser = require('body-parser');
const oracledb = require("oracledb");

route.use(bodyParser.urlencoded({ extended: false }));
route.use(bodyParser.json());



oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

//공유 버튼 클릭하면 요청되는 method  
route.get('/',
      async (req, res) => {

        console.log("/rendering get 입장");
        logger.debug("/rendering get 입장");

        let connection;

        try{
          let result, sql, binds, options;

          sql = `SELECT NOTE_KEY,
                        USER_ID,
                        LOCAL_KEY,
                        DATA,
                        TO_CHAR(LAST_WORK, 'YYYYMMDDHH24MISS') AS LAST_WORK,
                        IS_FAVORITE,
                        IS_DELETE
                FROM ALI_NOTE_TBL 
                WHERE LOCAL_KEY = :LOCAL_KEY 
                AND USER_ID = :USER_ID`;

          binds = [
            req.query.localkey,
            req.query.userid  
          ];

          options = {
              autoCommit: true
          }

          connection = await oracledb.getConnection(config.dbconnection);
          result = await connection.execute(sql, binds, options);

          console.log("selected rows: " + result.rows);

          if(result.rows.length > 0){
             
            console.log(result.rows[0].DATA);

            //한글 깨질때 
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});

            res.end(result.rows[0].DATA);
          }else{
            res.status(204).send({});
          }

        }catch(err){
          logger.error("/rendering get 에서 오류가 났어요 : " + err);
          console.error("/rendering get 에서 오류가 났어요 : " + err);
        }finally{
          if (connection) {
            try {
              await connection.close();
            } catch (err) {
              logger.error("/rendering finally 에서 오류가 났어요 : " + err);
              console.error("/rendering finally 에서 오류가 났어요 : " + err);
            }
          }
        }
      
      });

module.exports = route;