const express = require("express");
const route = express.Router();
const bodyParser = require("body-parser");
const oracledb = require("oracledb");
const logger = require("../Helper/LogHelper");
const config = require("../Helper/Config");

route.use(bodyParser.urlencoded({ extended: false }));
route.use(bodyParser.json());

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

//전체 서브 노트 정보 조회
route.get("/", async (req, res) => {
    console.log("/noteitem get 입장");
    logger.debug("/noteitem get 입장");

    const {localKey, userId} = req.query;

    let connection;

    try {
        let result, sql, binds, options;

        sql = `SELECT ITEM_KEY,
                      LOCAL_KEY,
                      NOTE_KEY,
                      ITEM_TYPE,
                      VAL,
                      LEV,
                      TO_CHAR(FIRST_WORK, 'YYYYMMDDHH24MISS') AS FIRST_WORK,
                      TO_CHAR(LAST_WORK, 'YYYYMMDDHH24MISS') AS LAST_WORK,
                      OPTION_1,
                      OPTION_2,
                      OPTION_3,
                      OPTION_4,
                      OPTION_5
              FROM ALI_NOTE_ITEM_TBL 
              WHERE NOTE_KEY = (SELECT MAX(NOTE_KEY) FROM ALI_NOTE_INFO_TBL 
                              WHERE LOCAL_KEY = :LOCAL_KEY AND USER_ID = :USER_ID)`;

        //binds = [req.query.localkey, req.query.userid];
        binds = [localKey, userId];

        options = {
            autoCommit: true,
        };

        connection = await oracledb.getConnection(config.dbconnection);
        result = await connection.execute(sql, binds, options);

        console.log("selected rows: " + result.rows);

        if (result.rows != null) {
            res.status(200).send({ message: "Success Selected!", result: result.rows });
        } else {
            res.status(204).send({});
        }
    } catch (err) {
        logger.error("/noteitem get 에서 오류가 났어요 : " + err);
        console.error("/noteitem get 에서 오류가 났어요 : " + err);
        return;
    } finally {
        if (connection) {
            try {
                await connection.close();
                return;
            } catch (err) {
                logger.error("/noteitem finally 에서 오류가 났어요 : " + err);
                console.error("/noteitem finally 에서 오류가 났어요 : " + err);
                return;
            }
        }
    }
});

//서브 노트 정보 insert
route.post("/", async (req, res) => {

    console.log("/noteitem post 입장");
    logger.debug("/noteitem post 입장");

    const {
        userId,
        localKey,
        itemType,
        val,
        lev,
        option1,
        option2,
        option3,
        option4,
        option5
    } = req.body;

    let connection;
    
    try {
        let result, sql, binds, options;

        sql = `INSERT INTO ALI_NOTE_ITEM_TBL 
                (
                    ITEM_KEY,
                    LOCAL_KEY,
                    NOTE_KEY,
                    ITEM_TYPE,
                    VAL,
                    LEV,
                    FIRST_WORK,
                    LAST_WORK,
                    OPTION_1,
                    OPTION_2,
                    OPTION_3,
                    OPTION_4,
                    OPTION_5
                )
                VALUES
                (
                    ALI_COMMON_SEQ.NEXTVAL,
                    :localKey,
                    (SELECT MAX(NOTE_KEY) FROM ALI_NOTE_INFO_TBL 
                     WHERE USER_ID = :USER_ID AND LOCAL_KEY = :LOCAL_KEY),
                    :itemType,
                    :val,
                    :lev,
                    SYSDATE,
                    SYSDATE,
                    :option1,
                    :option2,
                    :option3,
                    :option4,
                    :option5
                )`;

        binds = [  
            localKey,
            userId,
            localKey,
            itemType,
            val,
            lev,
            option1,
            option2,
            option3,
            option4,
            option5
        ];

        options = {
            autoCommit: true,
        };

        connection = await oracledb.getConnection(config.dbconnection);
        result = await connection.execute(sql, binds, options);

        console.log("Inserted rows: " + result.rowsAffected);

        if (result.rowsAffected > 0) {
            res.status(200).send({ message: "Inserted success!", result: result.rows });
        } else {
            res.status(204).send({});
        }
    } catch (err) {
        logger.error("/noteitem post 에서 오류가 났어요 : " + err);
        console.error("/noteitem post 에서 오류가 났어요 : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                logger.error("/noteitem post finally 에서 오류가 났어요 : " + err);
                console.error("/noteitem post finally 에서 오류가 났어요 : " + err);
            }
        }
    }
});

//서브 노트 정보 업데이트
route.put("/", async (req, res) => {
    console.log("/noteitem put 입장");
    logger.debug("/noteitem put 입장");

    const {userId,
           localKey,
           noteKey,
           val,
           lev,
           option1,
           option2,
           option3,
           option4,
           option5 } = req.body;

    let connection;

    try {
        let result, sql, binds, options;

        sql = `UPDATE ALI_NOTE_ITEM_TBL 
               SET    
               VAL = :val,
               LEV = :lev,
               LAST_WORK = SYSDATE,
               OPTION_1 = :option1,
               OPTION_2 = :option2,
               OPTION_3 = :option3,
               OPTION_4 = :option4, 
               OPTION_5 = :option5
               WHERE LOCAL_KEY = :LOCAL_KEY 
               AND NOTE_KEY = (SELECT MAX(NOTE_KEY) FROM ALI_NOTE_INFO_TBL 
               WHERE USER_ID = :USER_ID AND LOCAL_KEY = :LOCAL_KEY)`;

        binds = [val,
                 lev,
                 option1,
                 option2,
                 option3,
                 option4,
                 option5,
                 localKey,
                 userId,
                 noteKey ];

        options = {
            autoCommit: true,
        };

        connection = await oracledb.getConnection(config.dbconnection);
        result = await connection.execute(sql, binds, options);

        console.log("updated rows: " + result.rowsAffected);

        if (result.rowsAffected > 0) {
            res.status(200).send({ message: "Success Updated!", result: result.rowsAffected });
        } else {
            res.status(204).send({});
        }
    } catch (err) {
        logger.error("/noteitem put 에서 오류가 났어요 : " + err);
        console.error("/noteitem put 에서 오류가 났어요 : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                logger.error("/noteitem put finally 에서 오류가 났어요 : " + err);
                console.error("/noteitem put finally 에서 오류가 났어요 : " + err);
            }
        }
    }
});
//서브 노트 정보 삭제 - note item data 도 삭제 해야 함 
route.delete("/", async (req, res) => {
    console.log("/noteitem delete 입장");
    logger.debug("/noteitem delete 입장");

    const {localKey, noteKey} = req.body;

    let connection;
    //삭제를 할 때는 부모 자식 모두 삭제합니다
    
    try {

        let result, sql, binds, options;

        sql = ` DELETE FROM ALI_NOTE_ITEM_TBL 
                WHERE LOCAL_KEY = :LOCAL_KEY 
                AND NOTE_KEY = :NOTE_KEY`;

        binds = [localKey, noteKey];

        options = {
            autoCommit: true,
        };

        connection = await oracledb.getConnection(config.dbconnection);
        result = await connection.execute(sql, binds, options);

        console.log("deleted rows: " + result.rowsAffected);

        if (result.rowsAffected > 0) {
            res.status(200).send({ message: "Success deleted!", result: result.rowsAffected });
        } else {
            res.status(204).send({});
        }
    } catch (err) {
        logger.error("/noteitem delete 에서 오류가 났어요 : " + err);
        console.error("/noteitem delete 에서 오류가 났어요 : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                logger.error("/noteitem delete finally 에서 오류가 났어요 : " + err);
                console.error("/noteitem delete finally 에서 오류가 났어요 : " + err);
            }
        }
    }
});

module.exports = route;
