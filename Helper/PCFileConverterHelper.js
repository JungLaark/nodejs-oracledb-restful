const ffpmegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const config = require("./Config");
const logger = require("./LogHelper");

const waveFile = require("wavefile").WaveFile;
const safeBuffer = require("safe-buffer").Buffer;
const webSocket = require("ws");

const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

ffmpeg.setFfmpegPath(ffpmegPath);

var flag = false;

/*서버 테스트*/
const path2 = config.path2.path2Server;

/*로컬 테스트*/
//const path2 = config.path2.path2Local;

module.exports.fileConverter = (filekey, filepath, userid) => {

    //filekey: 'admin_000001'
    //filepath: '/home/sorizava/alinote/stream/abcdef.wav'
    //userid: 'admin

    try {
        //파일 리스트 읽어옴. 
        fs.readdir(path2, (err, fileList) => {

            logger.debug("작업이 시작되었습니다.");

            if (err) {
                console.log("wav파일을 읽어오려할 때 오류가 났어요 : " + err);
                logger.error("wav파일을 읽어오려할 때 오류가 났어요 : " + err);
                
                return;
            }
            
            fileList.forEach((element) => {

                //파일에 대한 조건을 주지 않았다. .m4a 면 될거같은데 
                let fileNameAndExt = path.basename(element);
                    
                if (fileNameAndExt.substring(fileNameAndExt.length - 4, fileNameAndExt.length) == ".m4a") {

                const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"_]/gi;
                console.log("fileNameAndExt : " + fileNameAndExt);

                let phoneNumber = fileNameAndExt.substring(fileNameAndExt.length - 18, fileNameAndExt.length - 4);
                let dateNumber = fileNameAndExt.substring(fileNameAndExt.length - 18, fileNameAndExt.length - 4); //.replace(regExp, "");

                console.log("phoneNumber : " + phoneNumber + " ," + "dateNumber : " + dateNumber.replace(regExp, ""));

                let saveFilePath = dateNumber.replace(regExp, "") + ".wav";
                    //wav 파일로 변환한다. wav 파일만 준다고 했던거 같은데 이런 과정 필요없는거 아닌가여? 
                    ffmpeg(path2 + fileNameAndExt)
                        .toFormat("wav")
                        .on("err", (err) => {
                            console.log("wav 파일로 바꾸기 An error occured : " + err.message);
                            logger.debug("wav 파일로 바꾸기 An error occured : " + err.message);
                        })
                        .on("progress", (progress) => {})
                        .on("end", () => {
                          //파일 바꾸기 끝 
                            logger.debug("saved file path : " + saveFilePath);
                            console.log("saved file path : " + saveFilePath);

                            insertFileInfo(saveFilePath);
                            transferWavFile(saveFilePath);
                        })
                        .save("filepath");
                        //.save("./uploads/admin_" + saveFilePath);
                    }
               
            });
        });
    } catch (err) {
        console.log("wav 파일 변환 중 오류 : " + err);
        logger.error("wav 파일 변환 중 오류 : " + err);
    }
};


//wav파일을 stt 서버로 전송하는 함수
module.exports.transferWavFile = (filekey, filepath, userid) => {
    
    //filekey: 'admin_000001'
    //filepath: '/home/sorizava/alinote/stream/abcdef.wav'
    //userid: 'admin
    //파일 정보 씀 
    insertFileInfo(filekey, filepath, userid);
    

    if (filepath.substring(filepath.length - 4, filepath.length) == ".wav") {

        try {

            /*로컬 테스트*/
            //console.log("pc버전 transferWavFile -> saveFilePath : ./uploads/" + filepath.substring(31, filepath.length));
            //logger.debug("pc버전 transferWavFile -> saveFilePath : ./uploads/" + filepath.substring(31, filepath.length));
            //let wav = new waveFile(fs.readFileSync("./uploads/" + filepath));
            
            /*서버 테스트*/
            console.log("pc버전 transferWavFile -> saveFilePath : /home/sorizava/alinote/stream/" + filepath.substring(30, filepath.length));
            logger.debug("pc버전 transferWavFile -> saveFilePath : /home/sorizava/alinote/stream/" + filepath.substring(30, filepath.length));
            let wav = new waveFile(fs.readFileSync("/home/sorizava/alinote/stream/" + filepath.substring(30, filepath.length)));

            let wavBuffer = wav.toBuffer();
            const socket = new webSocket("ws://ailab.sorizava.co.kr:3179/client/ws/speech?single=false&model=KOREAN_16K");

            socket.onopen = (e) => {
                console.log("소켓이 열렸어요.");

                const buffer = safeBuffer.from(wavBuffer);
                const bufferSize = 8000;
                for (let i = 0; i < wavBuffer.length; i += bufferSize) {
                    let sendBuffer = safeBuffer.alloc(bufferSize);
                    buffer.copy(sendBuffer, 0, i, i + bufferSize);

                    socket.send(sendBuffer);
                }

                socket.send("EOS");
                console.log("wav 파일 데이터를 stt 서버에 보냈습니다.");
                logger.debug("wav 파일 데이터를 stt 서버에 보냈습니다.");
            };

            socket.onerror = (e) => {
                console.log("웹 소켓 부근에서 error 발생 : " + e.message);
                logger.debug("웹 소켓 부근에서 error 발생 : " + e.message);
            };

            socket.onclose = () => {
                console.log("소켓이 닫혔어요.");
                logger.debug("소켓이 닫혔어요.");
                updateFileInfo(filekey, filepath, userid);
                //여기서 테이블 업데이트 하면 됨 
                console.log("음성인식이 끝나서 ALI_STT_RESULT_TBL STT_YN 칼럼 업데이트 할거에요.");
                logger.debug("음성인식이 끝나서 ALI_STT_RESULT_TBL STT_YN 칼럼 업데이트 할거에요.");

               

                updateColSttResult(filekey);
            };

            socket.onmessage = (message) => {
                var json = JSON.parse(message.data);

                if (json.sessionId) {
                } else {
                    if (json.result.final) {
                        if (json.result.hypotheses) {
                            for (var i = 0; i < json.result.hypotheses.length; i++) {
                                var segment_start = json["segment-start"];
                                var segment_length = json["segment-length"];
                                var transcript = json.result.hypotheses[i]["transcript"];

                                console.log("stt 결과물 json parsing 완료 후 db에 이제 넣을거에요.");
                                logger.debug("stt 결과물 json parsing 완료 후 db에 이제 넣을거에요");

                                insertFile(filekey, transcript, segment_start, segment_length);
                            }

                        }
                    }
                }
            };
        } catch (err) {
            console.log("stt로 보낼 때 에러가 났어요 : " + err);
            logger.error("stt로 보낼 때 에러가 났어요 : " + err);
        }
    }
};

//ALI_WAVFILE_TBL 에 파일 정보 넣기
const insertFileInfo = async (filekey, filepath, userid) => {
    
    //filekey: 'admin_000001'
    //filepath: '/home/sorizava/alinote/stream/abcdef.wav'
    //userid: 'admin


    let connection;

    try {
        oracledb.autoCommit = true;
        console.log('PC버전 filekey : ' + filekey + ', filepath : ' + filepath +', userid :' + userid);

        connection = await oracledb.getConnection({
            user: config.dbconnection.user,
            password: config.dbconnection.password,
            connectString: config.dbconnection.connectString,
        });

        const result = await connection.execute(
         `
        INSERT INTO ALI_WAVFILE_TBL(FILE_KEY, CREATED_DATE, INSERTED_DATE, USER_ID, STT_YN)
        VALUES (
            :filekey,
            (SELECT SYSDATE FROM DUAL),
            (SELECT SYSDATE FROM DUAL),
            :userid,
            'n'
        )
          `,
            [filekey, userid],
            { autoCommit: true },
        );

        console.log("ALI_WAVFILE_TBL Inserted : " + result.rowsAffected);
        logger.debug("ALI_WAVFILE_TBL Inserted : " + result.rowsAffected);
    } catch (err) {
        console.error("ALI_WAVFILE_TBL insert 할 때 에러가 났어요. : " + err);
        logger.error("ALI_WAVFILE_TBL insert 할 때 에러가 났어요. : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};
//ALI_WAVFILE_TBL 에 파일 정보 넣기
const updateFileInfo = async (filekey, filepath, userid) => {
    
    //filekey: 'admin_000001'
    //filepath: '/home/sorizava/alinote/stream/abcdef.wav'
    //userid: 'admin


    let connection;

    try {
        oracledb.autoCommit = true;
        console.log('PC버전 filekey : ' + filekey + ', filepath : ' + filepath +', userid :' + userid);

        connection = await oracledb.getConnection({
            user: config.dbconnection.user,
            password: config.dbconnection.password,
            connectString: config.dbconnection.connectString,
        });

        const result = await connection.execute(
         `

        UPDATE ALI_WAVFILE_TBL SET STT_YN = 'y' WHERE USER_ID = :USER_ID AND FILE_KEY = :FILE_KEY
          `,
            [userid, filekey],
            { autoCommit: true },
        );

        console.log("ALI_WAVFILE_TBL updated : " + result.rowsAffected);
        logger.debug("ALI_WAVFILE_TBL updated : " + result.rowsAffected);
    } catch (err) {
        console.error("ALI_WAVFILE_TBL updated 할 때 에러가 났어요. : " + err);
        logger.error("ALI_WAVFILE_TBL updated 할 때 에러가 났어요. : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

//음성 인식 결과 db에 넣기
const insertFile = async (fileName, transcript, segment_start, segment_length) => {
    console.log("PC버전 fileName : " + fileName + ", " + "transcript : " + transcript + ", segment_start : " + segment_start + ", segment_length : " + segment_length);

    let connection;

    try {
   
        oracledb.autoCommit = true;

        connection = await oracledb.getConnection({
            user: config.dbconnection.user,
            password: config.dbconnection.password,
            connectString: config.dbconnection.connectString,
        });

        //stt 에 대한 결과를 저장한다.
        //이미 저장이 되었다면 저장 할 필요 없을 것이다. 
        //select 를 하고 있으면 그냥 저장하지 말고 skip 

        //파일 ftp는 신경안써도 된다고 했나 

        const selectResult = await connection.execute(
            `SELECT * FROM ALI_STT_RESULT_TBL 
             WHERE FILE_KEY = :fileName 
             AND WORD_LENGTH = :segmentLength `,
            [fileName, segment_length]
        );

        if(selectResult.rows.length < 1){
            selectResult = await connection.execute(
                `INSERT INTO ALI_STT_RESULT_TBL
                     (ID, FILE_KEY, SPEAKER, WORD_START, WORD_LENGTH, WORD, INSERTED_DATE, STT_YN)
                 VALUES
                     (ALI_COMMON_SEQ.NEXTVAL,
                    :fileName,
                    DECODE(MOD(ALI_COMMON_SEQ.CURRVAL, 2), 0, 0, 1, 1),
                    :segment_start,
                    :segment_length,
                    :transcript,
                    (SELECT SYSDATE FROM DUAL),
                    'n'
                     )`,
                [fileName, segment_start, segment_length, transcript],
                { autoCommit: true }
            );
        }


    //     const result2 = await connection.execute(
    //     `
    //     INSERT INTO ALI_STT_RESULT_TBL(ID, FILE_KEY, SPEAKER, WORD_START, WORD_LENGTH, WORD, INSERTED_DATE, STT_YN)
    //     SELECT ALI_COMMON_SEQ.NEXTVAL, 
    //             :fileName,
    //             DECODE(MOD(ALI_COMMON_SEQ.CURRVAL, 2), 0, 0, 1, 1),
    //             :segment_start,
    //             :segment_length,
    //             :transcript,
    //             (SELECT SYSDATE FROM DUAL),
    //             'n'
    //     FROM DUAL 
    //     WHERE NOT EXISTS
    //     (SELECT ID, FILE_KEY, WORD_START, WORD_LENGTH, WORD, INSERTED_DATE, STT_YN  
    //         FROM ALI_STT_RESULT_TBL WHERE FILE_KEY = :fileName AND WORD_START = :segment_start AND WORD_LENGTH = :segment_length)
    // `,
    //         [fileName, segment_start, segment_length, transcript, fileName, segment_start, segment_length],
    //         { autoCommit: true },
    //     );

        console.log("ALI_STT_RESULT_TBL Inserted : " + selectResult.rowsAffected);
    } catch (err) {
        console.log("ALI_STT_RESULT_TBL : " + err);
        logger.error("ALI_STT_RESULT_TBL insert 할 때 에러가 났어요. : " + err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

//음성인식 완료 칼럼 
const updateColSttResult = async (filekey) => {
    console.log("updateColSttResult 함수 진입");
    logger.debug("updateColSttResult 함수 진입");

    //filekey: 'admin_000001'
    //filepath: '/home/sorizava/alinote/stream/abcdef.wav'
    //userid: 'admin
    let connection;

        try{
         
          let result, sql, binds, options;

          sql = `UPDATE ALI_STT_RESULT_TBL 
                 SET    STT_YN = 'y'
                 WHERE FILE_KEY = :filekey 
                `;

          binds = [
              filekey
          ];

          options = {
              autoCommit: true
          }

          connection = await oracledb.getConnection(config.dbconnection);
          result = await connection.execute(sql, binds, options)

          console.log("updated rows: " + result.rowsAffected);

       
        }catch(err){
          logger.error("pc버전 updateColSttResult 에서 오류가 났어요 : " + err);
          console.error("pc버전 updateColSttResult 에서 오류가 났어요 : " + err);
        }finally{
          if (connection) {
            try {
              await connection.close();
            } catch (err) {
              logger.error("pc버전 updateColSttResult finally 에서 오류가 났어요 : " + err);
              console.error("pc버전 updateColSttResult finally 에서 오류가 났어요 : " + err);
            }
          }
        }
};
