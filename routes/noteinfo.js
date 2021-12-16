const express = require("express");
const route = express.Router();
const bodyParser = require("body-parser");
const oracledb = require("oracledb");
const logger = require("../Helper/LogHelper");
const config = require("../Helper/Config");

route.use(bodyParser.urlencoded({ extended: false }));
route.use(bodyParser.json());

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

//전체 노트 정보 조회
route.get("/", async (req, res) => {
    console.log("/noteinfo get 입장");
    logger.debug("/noteinfo get 입장");

    const {localKey, userId} = req.query;

    let connection;

    try {
        let result, sql, binds, options;

        sql = `SELECT NOTE_KEY,
                      LOCAL_KEY,
                      USER_ID,
                      TITLE,
                      MEMO,
                      NOTE_CODE,
                      FOLDER_PATH,
                      IS_DELETE_YN,
                      IS_FAVORITE_YN,
                      NOTE_SIZE,
                      TO_CHAR(FIRST_WORK, 'YYYYMMDDHH24MISS') AS FIRST_WORK,
                      TO_CHAR(LAST_WORK, 'YYYYMMDDHH24MISS') AS LAST_WORK,
                      TO_CHAR(DELETE_WORK, 'YYYYMMDDHH24MISS') AS DELETE_WORK
              FROM ALI_NOTE_INFO_TBL 
              WHERE LOCAL_KEY = :LOCAL_KEY 
              AND USER_ID = :USER_ID`;

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
        logger.error("/noteinfo get 에서 오류가 났어요 : " + err);
        console.error("/noteinfo get 에서 오류가 났어요 : " + err);
        return;
    } finally {
        if (connection) {
            try {
                await connection.close();
                return;
            } catch (err) {
                logger.error("/noteinfo finally 에서 오류가 났어요 : " + err);
                console.error("/noteinfo finally 에서 오류가 났어요 : " + err);
                return;
            }
        }
    }
});

//노트 정보 insert
route.post("/", async (req, res) => {

    console.log("/noteinfo post 입장");
    logger.debug("/noteinfo post 입장");

    const {localKey, 
           userId,
           title,
           memo,
           noteCode,
           folderPath,
           noteSize} = req.body;

    console.log(localKey + "," + userId);

    let connection;

    try {
        let result, sql, binds, options;

        sql = `INSERT INTO ALI_NOTE_INFO_TBL 
                    (
                    NOTE_KEY,
                    LOCAL_KEY,
                    USER_ID,
                    TITLE,
                    MEMO,
                    NOTE_CODE,
                    FOLDER_PATH,
                    IS_DELETE_YN,
                    IS_FAVORITE_YN,
                    NOTE_SIZE,
                    FIRST_WORK,
                    LAST_WORK,
                    DELETE_WORK
                    )
                VALUES
                    (
                    ALI_COMMON_SEQ.NEXTVAL,
                    :localKey,
                    :userId,
                    :title,
                    :memo,
                    :noteCode,
                    :folderPath,
                    'N',
                    'N',
                    :noteSize,
                    SYSDATE,
                    SYSDATE,
                    SYSDATE
                    )`;

        binds = [localKey, userId, title, memo, 
                 noteCode, folderPath, noteSize];

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
        logger.error("/noteinfo post 에서 오류가 났어요 : " + err);
        console.error("/noteinfo post 에서 오류가 났어요 : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                logger.error("/noteinfo post finally 에서 오류가 났어요 : " + err);
                console.error("/noteinfo post finally 에서 오류가 났어요 : " + err);
            }
        }
    }
});

//노트 정보 업데이트
route.put("/", async (req, res) => {
    
    console.log("/noteinfo put 입장");
    logger.debug("/noteinfo put 입장");

    const {
        memo,
        isFavoriteYn,
        noteSize,
        localKey,
        userId
    } = req.body;

    let connection;

    try {
        let result, sql, binds, options;

        sql = `UPDATE ALI_NOTE_INFO_TBL 
               SET    
                    MEMO = :memo,
                    IS_FAVORITE_YN = :isFavoriteYn,
                    NOTE_SIZE = :noteSize,
                    LAST_WORK = SYSDATE
               WHERE LOCAL_KEY = :LOCAL_KEY 
               AND USER_ID = :USER_ID`;

        binds = [ 
            memo,
            isFavoriteYn,
            noteSize,
            localKey,
            userId
        ];

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
        logger.error("/noteinfo put 에서 오류가 났어요 : " + err);
        console.error("/noteinfo put 에서 오류가 났어요 : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                logger.error("/noteinfo put finally 에서 오류가 났어요 : " + err);
                console.error("/noteinfo put finally 에서 오류가 났어요 : " + err);
            }
        }
    }
});
//노트 정보 삭제 - note item data 도 삭제 해야 함 
route.delete("/", async (req, res) => {

    console.log("/noteinfo delete 입장");
    logger.debug("/noteinfo delete 입장");

    const {localKey, userId} = req.body;

    let connection;
    //삭제를 할 때는 부모 자식 모두 삭제합니다
    
    try {

        let result, sql, binds, options;

        sql = ` UPDATE ALI_NOTE_INFO_TBL 
                SET    
                IS_DELETE_YN = 'Y',
                DELETE_WORK = SYSDATE
                WHERE LOCAL_KEY = :LOCAL_KEY 
                AND USER_ID = :USER_ID`;

        binds = [localKey, userId];

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
        logger.error("/noteinfo delete 에서 오류가 났어요 : " + err);
        console.error("/noteinfo delete 에서 오류가 났어요 : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                logger.error("/noteinfo delete finally 에서 오류가 났어요 : " + err);
                console.error("/noteinfo delete finally 에서 오류가 났어요 : " + err);
            }
        }
    }
});

module.exports = route;
