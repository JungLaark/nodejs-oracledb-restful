const ffpmegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const config = require("../Helper/Config");
const logger = require("../Helper/LogHelper");

const waveFile = require("wavefile").WaveFile;
const safeBuffer = require("safe-buffer").Buffer;
const webSocket = require("ws");

const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

ffmpeg.setFfmpegPath(ffpmegPath);
//ls
//const path2 = "/home/sorizava/";
//const path2 = "./uploads/";
//const flag = false;

var flag = false;

const path2 = config.path2.path2Server;
//const path2 = config.path2.path2Local;


//여기서 user id 만들어야 함 
module.exports.fileConverter = (userid) => {
    try {
        fs.readdir(path2, (err, fileList) => {
            logger.debug("파일 관련 작업이 시작되었습니다.");

            if (err) {
                console.log("wav파일을 읽어오려할 때 오류가 났어요 : " + err);
                logger.error("wav파일을 읽어오려할 때 오류가 났어요 : " + err);
                return;
            }
            
            logger.debug("/home/sorizava/alinote/stream 파일 개수: " + fileList.length);

            fileList.forEach((element) => {
                logger.debug("파일 리스트 foreach 문 진입");
                
                //파일에 대한 조건을 주지 않았다. .m4a 면 될거같은데 
                let fileNameAndExt = path.basename(element);
                    
                if (fileNameAndExt.substring(fileNameAndExt.length - 4, fileNameAndExt.length) == ".m4a") {
                     //__ __ 01083952111_211026_090744.m4a
                    //reco_01083952111_211026_162314.m4a
                    const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"_]/gi;
                    console.log("fileNameAndExt : " + fileNameAndExt);

                    let phoneNumber = fileNameAndExt.substring(fileNameAndExt.length - 18, fileNameAndExt.length - 4);
                    let dateNumber = fileNameAndExt.substring(fileNameAndExt.length - 18, fileNameAndExt.length - 4); 


                    let saveFilePath = dateNumber.replace(regExp, "") + ".wav";
                    let otherFilePath = path2 + dateNumber.replace(regExp, "") + ".jsc";
                    
                    //동기로 처리 
                    if(!fs.existsSync(otherFilePath)){
                        logger.debug("otherFilePath 의 파일 생성 : " + otherFilePath);
                        fs.writeFileSync(otherFilePath, "empty");

                        try{
                            ffmpeg(path2 + fileNameAndExt)
                                .toFormat("wav")
                                .on("err", (err) => {
                                    console.log("wav 파일로 바꾸기 An error occured : " + err.message);
                                    logger.debug("wav 파일로 바꾸기 An error occured : " + err.message);
                                })
                                .on("progress", (progress) => {})
                                .on("end", () => {
                                    //파일 바꾸기 끝 
                                    logger.debug("파일 컨버팅 끝 saved file path : " + saveFilePath);
                                    console.log("파일 컨버팅 끝saved file path : " + saveFilePath);
                                    insertFileInfo(saveFilePath, userid);
                                    transferWavFile(saveFilePath, userid);
                                })
                                .save("/home/sorizava/alinote/stream/" + userid + "_" + saveFilePath);
                                //.save("./uploads/admin_" + saveFilePath);
                        }catch(err){
                            logger.debug("파일 컨버팅 하던 와중에 오류가 났어요" + err);
                        }

                    }else{
                        logger.debug("파일이 있어서 그냥 skipped");
                    }
                }
               
            });
            logger.debug("process end");

        });
    } catch (err) {
        console.log("wav 파일 변환 중 오류가 났어요 : " + err);
        logger.error("wav 파일 변환 중 오류 : " + err);
    }
};

//wav파일을 stt 서버로 전송하는 함수
const transferWavFile = (saveFilePath, userid) => {
    logger.debug("stt 서버로 전송하는 함수 진입 : " + saveFilePath);
    logger.debug("stt 서버로 전송하는 함수 진입: " + saveFilePath);

    if (saveFilePath.substring(saveFilePath.length - 4, saveFilePath.length) == ".wav") {
        //console.log("filename of transferWavFile : " + fileName);
        try {

            console.log("stt 서버로 전송하는 함수 -> saveFilePath : /home/sorizava/alinote/stream/" + saveFilePath);
            logger.debug("stt 서버로 전송하는 함수 -> saveFilePath : /home/sorizava/alinote/stream/" + saveFilePath);



            let otherFilePath = "/home/sorizava/alinote/stream/" + userid + "_" + saveFilePath;
            otherFilePath = otherFilePath.substr(0, otherFilePath.length-4) + ".stt";
            /*로컬 테스트용*/
            //let wav = new waveFile(fs.readFileSync("./uploads/" + saveFilePath));

            logger.debug("stt otherPath is: " + otherFilePath);
            if(!fs.existsSync(otherFilePath)){

                /*서버 테스트용*/
                let wav = new waveFile(fs.readFileSync("/home/sorizava/alinote/stream/" + userid + "_" + saveFilePath));

                let wavBuffer = wav.toBuffer();
                const socket = new webSocket("ws://ailab.sorizava.co.kr:3179/client/ws/speech?single=false&model=KOREAN_16K");
                socket.onopen = (e) => {

                    console.log("stt 서버로 전송하는 소켓이 열렸어요.");
                    logger.debug("stt 서버로 전송하는 소켓이 열렸어요.");

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
                    console.log("stt 서버로 전송하는 소켓 부근에서 error 발생 : " + e.message);
                    logger.debug("stt 서버로 전송하는 소켓에서 error 발생 : " + e.message);
                };

                socket.onclose = () => {
                    console.log("stt 서버로 전송하는 소켓이 닫혔어요.");
                    logger.debug("stt 서버로 전송하는 소켓이 닫혔어요.");

                    console.log("음성인식이 끝나서 ALI_STT_RESULT_TBL STT_YN 칼럼 업데이트 할거에요.");
                    logger.debug("음성인식이 끝나서 ALI_STT_RESULT_TBL STT_YN 칼럼 업데이트 할거에요.");

                    logger.debug("stt file write: " + otherFilePath);

                    fs.writeFileSync(otherFilePath, "empty");
                    //updateColSttResult("admin_" + saveFilePath.substring(0, saveFilePath.length - 4));
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

                                    insertFile(saveFilePath, transcript, segment_start, segment_length, userid);
                                }
                            }
                        }
                    }
                };
            }else{
                logger.debug("stt skipped");
            }

        } catch (err) {
            console.log("stt서버로 보낼 때 에러가 났어요 : " + err);
            logger.error("stt서버로 보낼 때 에러가 났어요 : " + err);
        }
    }
};

//ALI_WAVFILE_TBL 에 파일 정보 넣기
const insertFileInfo = async (fileName, userid) => {

    let connection;

    try {
        oracledb.autoCommit = true;
        
        const createdDate = fileName.substring(0, fileName.length-4);
        fileName = userid + "_" + fileName.substring(0, fileName.length - 4);
        console.log("wav파일 정보 넣는 함수 -> createDate : " + createdDate);
        console.log("wav파일 정보 넣는 함수 -> filename : " + fileName);
        logger.debug("wav파일 정보 넣는 함수 -> createDate : " + createdDate);
        logger.debug("wav파일 정보 넣는 함수 -> filename : " + fileName);

        connection = await oracledb.getConnection({
            user: config.dbconnection.user,
            password: config.dbconnection.password,
            connectString: config.dbconnection.connectString,
        });

        const result = await connection.execute(
    `
      INSERT INTO ALI_WAVFILE_TBL(FILE_KEY, CREATED_DATE, INSERTED_DATE, USER_ID, STT_YN)
      SELECT :fileName,
            TO_DATE(:createDate, 'YYYYMMDDHH24MISS'),
            (SELECT SYSDATE FROM DUAL),
            :userid,
            'n'
      FROM DUAL 
      WHERE NOT EXISTS
      (SELECT FILE_KEY, CREATED_DATE, INSERTED_DATE 
      FROM ALI_WAVFILE_TBL WHERE FILE_KEY = :fileName AND CREATED_DATE = TO_DATE(:createDate, 'YYYYMMDDHH24MISS'))
    `,
            [fileName, createdDate, userid, fileName, createdDate],
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

//음성 인식 결과 db에 넣기
const insertFile = async (fileName, transcript, segment_start, segment_length, userid) => {
    logger.debug("음성 인식 결과 넣는 함수 진입 : " + fileName);
    console.log("fileName : " + fileName + ", " + "transcript : " + transcript + ", segment_start : " + segment_start + ", segment_length : " + segment_length);

    let connection;
    let returnCode;

    try {
        const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"_]/gi;
        fileName = userid + "_" + fileName.substring(0, fileName.length-4);
        console.log("음성 인식 결과 넣는 함수 진입 -> fileName : " + fileName);
   
        oracledb.autoCommit = true;

        connection = await oracledb.getConnection({
            user: config.dbconnection.user,
            password: config.dbconnection.password,
            connectString: config.dbconnection.connectString,
        });
        const result2 = await connection.execute(
            `
      INSERT INTO ALI_STT_RESULT_TBL(ID, FILE_KEY, SPEAKER, WORD_START, WORD_LENGTH, WORD, INSERTED_DATE, STT_YN)
      SELECT ALI_COMMON_SEQ.NEXTVAL, 
            :fileName,
            DECODE(MOD(ALI_COMMON_SEQ.CURRVAL, 2), 0, 0, 1, 1),
            :segment_start,
            :segment_length,
            :transcript,
            (SELECT SYSDATE FROM DUAL),
            'n'
      FROM DUAL 
      WHERE NOT EXISTS
      (SELECT ID, FILE_KEY, WORD_START, WORD_LENGTH, WORD, INSERTED_DATE, STT_YN 
        FROM ALI_STT_RESULT_TBL WHERE FILE_KEY = :fileName AND WORD_START = :segment_start AND WORD_LENGTH = :segment_length)
    `,
            [fileName, segment_start, segment_length, transcript, fileName, segment_start, segment_length],
            { autoCommit: true },
        );
        console.log("ALI_STT_RESULT_TBL Inserted : " + result2.rowsAffected);
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
    logger.debug('updateColSttResult ' + 1);
    console.log("updateColSttResult 함수 진입");
    logger.debug("updateColSttResult 함수 진입");

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

