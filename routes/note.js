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

//노트 정보 조회 
route.get('/',
      async (req, res) => {

        console.log("/note get 입장");
        logger.debug("/note get 입장");

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

          if(result.rows != null){
            res.status(200).send({'message' : 'Success Selected!',
                                'result' : result.rows});
          }else{
            res.status(204).send({});
          }

        }catch(err){
          logger.error("/note get 에서 오류가 났어요 : " + err);
          console.error("/note get 에서 오류가 났어요 : " + err);
          return;
        }finally{
          if (connection) {
            try {
              await connection.close();
              return;
            } catch (err) {
              logger.error("/note finally 에서 오류가 났어요 : " + err);
              console.error("/note finally 에서 오류가 났어요 : " + err);
              return;
            }
          }
        }
      
      });

//노트 정보 insert 
route.post('/',
      async (req, res) => {

        //console.log(JSON.stringify(req.body));

        //console.log(req);

        console.log(req.body.userid +", "+
          req.body.localkey+", "+
          req.body.data+", "+
          req.body.isfavorite+", "+
          req.body.isdelete);

        console.log("/note post 입장");
        logger.debug("/note post 입장");

        let connection;

        try{
            let result, sql, binds, options;

            sql = `INSERT INTO ALI_NOTE_TBL 
                            (NOTE_KEY,
                            USER_ID,
                            LOCAL_KEY,
                            DATA,
                            LAST_WORK,
                            IS_FAVORITE,
                            IS_DELETE)
                    VALUES(
                        ALI_COMMON_SEQ.NEXTVAL,
                        :userid,
                        :localkey,
                        :data,
                        (SELECT SYSDATE FROM DUAL),
                        :isfavorite,
                        :isdelete
                    )`;

              binds = [
                req.body.userid,
                req.body.localkey,
                req.body.data,
                req.body.isfavorite,
                req.body.isdelete
              ];

              options = {
                  autoCommit: true
              }

              connection = await oracledb.getConnection(config.dbconnection);
              result = await connection.execute(sql, binds, options)

            console.log("Inserted rows: " + result.rowsAffected);

            if(result.rowsAffected > 0){
              res.status(200).send({'message' : 'Inserted success!',
                                  'result' : result.rows });
            }else{
              res.status(204).send({});
            }

        }catch(err){
          logger.error("/note post 에서 오류가 났어요 : " + err);
          console.error("/note post 에서 오류가 났어요 : " + err);
        }finally{
          if (connection) {
            try {
              await connection.close();
            } catch (err) {
              logger.error("/note post finally 에서 오류가 났어요 : " + err);
              console.error("/note post finally 에서 오류가 났어요 : " + err);
            }
          }
        }
      
      });

//노트 정보 업데이트 
route.put('/',
      async (req, res) => {

        console.log("/note put 입장");
        logger.debug("/note put 입장");

        let connection;

        try{
         
          let result, sql, binds, options;

          sql = `UPDATE ALI_NOTE_TBL 
                 SET    DATA = :data,
                        LAST_WORK = (SELECT SYSDATE FROM DUAL),
                        IS_FAVORITE = :isfavorite,
                        IS_DELETE = :isdelete
                WHERE LOCAL_KEY = :LOCAL_KEY 
                AND USER_ID = :USER_ID`;

          binds = [
              
              req.body.data,
              req.body.isfavorite,
              req.body.isdelete,
              req.body.localkey,
              req.body.userid  
          ];

          options = {
              autoCommit: true
          }

          connection = await oracledb.getConnection(config.dbconnection);
          result = await connection.execute(sql, binds, options)

          console.log("updated rows: " + result.rowsAffected);

          if(result.rowsAffected > 0){
            res.status(200).send({'message' : 'Success Updated!',
                                'result' : result.rowsAffected});
          }else{
            res.status(204).send({});
          }

        }catch(err){
          logger.error("/note put 에서 오류가 났어요 : " + err);
          console.error("/note put 에서 오류가 났어요 : " + err);
        }finally{
          if (connection) {
            try {
              await connection.close();
            } catch (err) {
              logger.error("/note put finally 에서 오류가 났어요 : " + err);
              console.error("/note put finally 에서 오류가 났어요 : " + err);
            }
          }
        }
      
      });

module.exports = route;
