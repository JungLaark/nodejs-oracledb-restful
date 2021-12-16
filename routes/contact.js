const express = require("express");
const route = express.Router();
const bodyParser = require("body-parser");
const oracledb = require("oracledb");
const logger = require("../Helper/LogHelper");
const config = require('../Helper/Config');
const app = express();
route.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

//연락처 정보 INSERT 

route.post("/savelist", async (req, res) => {
  console.log("/contact/savelist 입장");
  logger.debug("/contact/savelist 입장");


  console.log(req.body);

  var index = 0;
  var result = new Array();
  const userid = req.body.userid;

  while(true){
    var id = req.body['id'+String(index)];

    if(!id){
        break;
    }
    var name = req.body['name'+String(index)];
    var phoneNumber = req.body['phone_number'+String(index)];

    result.push({id: id, name: name, phoneNumber: phoneNumber});
    insertContactData({id: id, name: name, phoneNumber: phoneNumber}, userid);
    
    index++;
  }
       
  console.log('result: ' + JSON.stringify(result));

});


const insertContactData = async (data, userid) => {
    console.log(data.id + data.name + data.phoneNumber);

    let connection;

    try {
        oracledb.autoCommit = true;

        connection = await oracledb.getConnection({
            user: config.dbconnection.user,
            password: config.dbconnection.password,
            connectString: config.dbconnection.connectString,
        });

        const result = await connection.execute(
            // INSERT INTO ALI_WAVFILE_TBL(FILE_KEY, CREATED_DATE, INSERTED_DATE)
            // VALUES(
            //       :fileName,
            //       :createDate,
            //       (SELECT SYSDATE FROM DUAL)
            // )
            `
            INSERT INTO ALI_CONTACT_TBL(ID, PHONE_NUM, NAME, INSERTED_DATE, USER_ID)
            SELECT TO_NUMBER(:id),
                  :phoneNumber,
                  :name,
                  (SELECT SYSDATE FROM DUAL),
                  :userid
            FROM DUAL 
            WHERE NOT EXISTS
            (SELECT ID, PHONE_NUM, NAME, INSERTED_DATE, USER_ID
            FROM ALI_CONTACT_TBL WHERE PHONE_NUM = :phoneNumber)
    `,
            [data.id, data.phoneNumber, data.name, userid, data.phoneNumber],
            { autoCommit: true },
        );
        logger.debug('insertContactData ' + 3);
        console.log("ALI_CONTACT_TBL Inserted : " + result.rowsAffected);
        logger.debug("ALI_CONTACT_TBL Inserted : " + result.rowsAffected);

        // if (result.rowsAffected >= 1) {
        //   //returnCode = res
        //     .status(200)
        //     .json({ message: "Insert Success!!!", inserted: result.rowsAffected });
        // }
    } catch (err) {
        console.error("ALI_CONTACT_TBL insert 할 때 에러가 났어요. : " + err);
        logger.error("ALI_CONTACT_TBL insert 할 때 에러가 났어요. : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }

}

//연락처 목록 
route.get("/getlist", async (req, res) => {
    //const param = req.query.callid;
    //const param2 = req.query.userid;
  
    console.log("/contact/getlist 입장 req.query.id : " + req.query.userid);
    logger.debug("/contact/getlist 입장");
  
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
            SELECT ID, PHONE_NUM, NAME, TO_CHAR(INSERTED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS INSERTED_DATE, USER_ID FROM ALI_CONTACT_TBL
            WHERE USER_ID = :USER_ID
         `,
        [req.query.userid]
      );

      //TO_CHAR(INSERTED_DATE, 'YYYY-MM-DD HH24:MI:SS')
  
      console.log(result.rows);
      logger.debug("select ALI_CONTACT_TBL :" + result.rows);
  
      if (result.rows.length > 0) {
        return res
          .status(200)
          .json({ message: "search Success!!!", "result": result.rows });
      } else {
        return res.status(406).json({ });
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
