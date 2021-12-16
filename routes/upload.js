const express = require("express");
const multer = require("multer");
const route = express.Router();
const logger = require("../Helper/LogHelper");
const bodyParser = require("body-parser");
const oracledb = require("oracledb");
const config = require("../Helper/Config");
const fileConverter = require("../Helper/FileConverterHelper");
const pcFileConverter = require("../Helper/PCFileConverterHelper");
const e = require("express");

route.use(bodyParser.urlencoded({ extended: true }));
route.use(bodyParser.json());

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

//파일 전송이 완료되면 요청됨 //그냥 get으로 하면 됨 
route.post("/complete", async (req, res) => {
    
    console.log("파일 전송 완료 후 converting 함수 호출");
    logger.debug("파일 전송 완료 후 converting 함수 호출");
    console.log("userid : " + req.body.userid);

    try {
        console.log("param : " + req.body.filePath + " : " + req.body.flag);

        fileConverter.fileConverter(userid);
        
    } catch (err) {
        console.log("/upload/complete 파일 컨버팅하는 함수 호출할 때 : " + err);
        logger.error("/upload/complete 파일 컨버팅하는 함수 호출할 때 에러가 났어요 : " + err);
    }

    logger.debug("file convert success");
    res.status(200).json({ message: "success", data: req.body.filePath });
});

//pc 버전에서 파일 드래그 앤 드랍했을 때 받는 요청 
route.get('/',
        async (req, res) => {

            console.log('/upload get 입장.. pc 버전 request');
            logger.debug('/upload get 입장.. pc 버전 request');

            try {

                pcFileConverter.transferWavFile(req.query.filekey, req.query.filepath, req.query.userid);

            } catch (err) {

                console.log("pc버전 /upload/ : " + err);
                logger.error("pc버전 /upload/ 에서 에러가 났어요 : " + err);
            }
        
            res.status(200).json({});

        });


//파일 stt 결과 확인하는 링크 추가 

//음성 파일 조회 file_key 
route.get('/sttresult',
      async (req, res) => {

        console.log("/upload/sttresult get 입장");
        logger.debug("/upload/sttresult get 입장");

        let connection;

        try{
          let result, sql, binds, options;

          sql = `SELECT FILE_KEY,
                        TO_CHAR(CREATED_DATE, 'YYYYMMDDHH24MISS') AS CREATED_DATE,
                        TO_CHAR(INSERTED_DATE, 'YYYYMMDDHH24MISS') AS INSERTED_DATE,
                        USER_ID,
                        STT_YN
                FROM ALI_WAVFILE_TBL 
                WHERE FILE_KEY = :LOCAL_KEY 
                `;

          binds = [
            req.query.filekey
          ];

          options = {
              autoCommit: true
          }

          connection = await oracledb.getConnection(config.dbconnection);
          result = await connection.execute(sql, binds, options);

          console.log("selected rows: " + result.rows);

          if(result.rows != null){
            return res.status(200).send({'message' : 'Success Selected!',
                                'result' : result.rows});
          }else{
            return res.status(204).send({});
          }

        }catch(err){
          logger.error("/upload/sttresult get 에서 오류가 났어요 : " + err);
          console.error("/upload/sttresult get 에서 오류가 났어요 : " + err);
        }finally{
          if (connection) {
            try {
              await connection.close();
            } catch (err) {
              logger.error("/upload/sttresult finally 에서 오류가 났어요 : " + err);
              console.error("/upload/sttresult finally 에서 오류가 났어요 : " + err);
            }
          }
        }
      
      });


//통화 내역 db저장
//이건 그냥 요청 받을 때 받으면 되는거자나 
//요청을 받는 곳과 분리가 필요함 
route.post("/calllist", async (req, res) => {

    var temp = 0;
    //console.log("통화 내역 업로드 method 진입");
    console.log("calllist : " + req.body.arrDto);
    logger.debug("calllist : " + req.body.arrDto);

    const userId = req.body.userid;
    let array = req.body.arrDto;
    let jsonArray = JSON.stringify(array);
    let parseArray = JSON.parse(array);

    logger.debug('calllog here');
    logger.debug(JSON.stringify(parseArray));

    let connection;


    oracledb.autoCommit = true;
        
    connection = await oracledb.getConnection({
        user: config.dbconnection.user,
        password: config.dbconnection.password,
        connectString: config.dbconnection.connectString,
    });
        
    logger.debug("calllist insert count: " + parseArray.length);
    var procCount = 0;
    try {
        for(let i=0; i<parseArray.length ; i++){

            
            logger.debug("calllist insert index: " + i);

            console.log(parseArray[i].date + ',' +
            parseArray[i].duration + ',' +
            parseArray[i].id + ',' +
            parseArray[i].number + ',' +
            parseArray[i].type + ','
            );


            const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"_]/gi;
            const fileKey = userId+"_" + "20" + parseArray[i].date;
            const dateString = "20" + parseArray[i].date;
        

                console.log(fileKey + ',' +
                dateString + ',' +
                parseArray[i].number + ',' +
                parseArray[i].duration + ',' +
                parseArray[i].type + ',' + 
                parseArray[i].id + ',' + 
                fileKey + ',' + 
                parseArray[i].duration + ',' + 
                parseArray[i].id + ','
                );


            //     const result = await connection.execute(
            // //여기에 문제가 있다고 하는거 같은데 
            // `
            // INSERT INTO ALI_CALLLIST_TBL(ID, USER_ID, FILE_KEY, CALL_DATE, PHONE_NUMBER, INSERTED_DATE, DURATION, TYPE, CALL_ID)
            // SELECT CALLLIST_ID.NEXTVAL, 
            //         'admin',
            //         :fileKey,
            //         TO_DATE(:dateString, 'YYYYMMDDHH24MISS'),
            //         :numberString,
            //         (SELECT SYSDATE FROM DUAL),
            //         TO_NUMBER(:duration),
            //         :type,
            //         :id
            // FROM DUAL 
            // WHERE NOT EXISTS
            // (SELECT ID, USER_ID, FILE_KEY, CALL_DATE, PHONE_NUMBER, INSERTED_DATE, DURATION, TYPE, CALL_ID
            //     FROM ALI_CALLLIST_TBL WHERE FILE_KEY = :fileKey AND DURATION = TO_NUMBER(:duration) AND CALL_ID = :id)
                
            // `,
            //         [fileKey, dateString, parseArray[i].number, parseArray[i].duration, parseArray[i].type, parseArray[i].id, fileKey, parseArray[i].duration, parseArray[i].id],
            //         { autoCommit: true },
            //     );
        
            //     console.log("ALI_CALLLIST_TBL inserted: " + result.rowsAffected);
            //     logger.debug("ALI_CALLLIST_TBL inserted: : " + result.rowsAffected);
        
            //     if (result.rowsAffected >= 1) {
            //         res.status(200).json({ message: "Insert Success!!!", inserted: result.rowsAffected });
            //     }

            var sql = "SELECT CALL_ID CNT FROM ALI_CALL_LIST_TBL WHERE CALL_ID = '"+parseArray[i].id+"' AND USER_ID = '"+userId+"'"
            logger.debug('sql: ' + sql);
            var result = await connection.execute(sql);
            
            if (result.rows.length >= 1) {
                logger.debug('callist insert skipped');
                continue;
            }else{
                sql = 
                "INSERT INTO ALI_CALL_LIST_TBL(USER_ID, FILE_KEY, CALL_DATE, PHONE_NUMBER, INSERTED_DATE, DURATION, TYPE, CALL_ID) " + 
                " VALUES('"+userId+"', '"+fileKey+"', TO_DATE('"+dateString+"', 'YYYYMMDDHH24MISS'), '"+parseArray[i].number+"', SYSDATE, TO_NUMBER('"+parseArray[i].duration+"'), '"+parseArray[i].type+"', '"+parseArray[i].id+"')"
                logger.debug('sql: ' + sql);
                result = await connection.execute(sql);
                
                logger.debug("ALI_CALL_LIST_TBL inserted: : " + result.rowsAffected);
    
                if (result.rowsAffected >= 1) {
                    procCount++;
                }
            }

            
            

        }
         
    } catch (err) {
        console.error(err);
                        res.status(200).json({ message: "Insert ignore"});
                        logger.error("ALI_CALL_LIST_TBL insert error : " + err);
        
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
        
        res.status(200).json({ message: "Insert Success!!!", inserted: procCount });
    }
});



//통화 내역 및 아이디 정보도 받는다 
route.post("/calllistwithid", async (req, res) => {

  var temp = 0;
  //console.log("통화 내역 업로드 method 진입");
  console.log("calllistwithid : " + req.body.arrDto);
  logger.debug("calllistwithid : " + req.body.arrDto);

//UnhandledPromiseRejectionWarning: SyntaxError: Unexpected token u in JSON at position 0

  //뭔가 여기서 예외처리를 해줘야 할 거 같은데 말이야 
  let array = req.body.arrDto;
  let jsonArray = JSON.stringify(array);
  let parseArray = JSON.parse(array);

  console.log(parseArray);
  logger.debug("parseArray : " + parseArray);
  logger.debug("req.body.userid : " + req.body.userid);


  let connection;
  let type;

  oracledb.autoCommit = true;
      
  connection = await oracledb.getConnection({
      user: config.dbconnection.user,
      password: config.dbconnection.password,
      connectString: config.dbconnection.connectString,
  });
      
  logger.debug("calllist insert count: " + parseArray.length);
  try {
      for(let i=0; i<parseArray.length ; i++){

          logger.debug(
            parseArray[i].dateTime + ',' +
            parseArray[i].duration + ',' +
            req.body.userid + ',' +
            parseArray[i].number + ',' +
            parseArray[i].type + ',' + 
            parseArray[i].dateTime + ',' 
          );

            console.log(
            dateString + ',' +
            parseArray[i].number + ',' +
            parseArray[i].duration + ',' +
            parseArray[i].type + ',' + 
            parseArray[i].dateTime + ',' + 
            parseArray[i].duration + ',' + 
            req.body.userid + ','
            );

            //숫자로 넣으세요 
            if(parseArray[i].type == 'OUTGOING'){
                type = '2';
            }else{
                type = '1';
            }

              const result = await connection.execute(
      
          `
          INSERT INTO ALI_CALLLIST_TBL(ID, USER_ID, FILE_KEY, CALL_DATE, PHONE_NUMBER, INSERTED_DATE, DURATION, TYPE, CALL_ID)
          SELECT CALLLIST_ID.NEXTVAL, 
                  :userid,
                  '',
                  TO_DATE(:dateString, 'YYYYMMDDHH24MISS'),
                  :numberString,
                  (SELECT SYSDATE FROM DUAL),
                  TO_NUMBER(:duration),
                  :type,
                  :id
          FROM DUAL 
          WHERE NOT EXISTS
          (SELECT ID, USER_ID, FILE_KEY, CALL_DATE, PHONE_NUMBER, INSERTED_DATE, DURATION, TYPE, CALL_ID
              FROM ALI_CALLLIST_TBL WHERE DURATION = TO_NUMBER(:duration) AND CALL_ID = :id)
              
          `,
                  [req.body.userid, parseArray[i].dateTime, parseArray[i].number, parseArray[i].duration, type, parseArray[i].id, parseArray[i].duration, parseArray[i].id],
                  { autoCommit: true },
              );
      
              console.log("ALI_CALLLIST_TBL inserted: " + result.rowsAffected);
              logger.debug("ALI_CALLLIST_TBL inserted: : " + result.rowsAffected);
      
              if (result.rowsAffected >= 1) {
                  res.status(200).json({ message: "Insert Success!!!", inserted: result.rowsAffected });
              }
      }
       
  } catch (err) {
      console.error(err);
      logger.error("ALI_CALLLIST_TBL insert error : " + err);
      
  } finally {
      if (connection) {
          try {
              await connection.close();
          } catch (err) {
              console.error(err);
          }
      }
  }
});

module.exports = route;
