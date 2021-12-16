const oracledb = require('oracledb');
oracledb.autoCommit = true;


const connectDB = (data) => {
    //쿼리만 받아와서 공통적으로 쓰려고 하였지만 그게 될랑가? 
    //select, => 결과 row return
    //insert, 
    //delete, 
    //update 
    //어떻게 하면 이 작업들을 
    console.log("coonectDB 함수 : " + data);

    oracledb.getConnection({

        user : "ALI_NOTE",
        password :"1234",
        connectString : "61.32.218.74:1521/XE"

    }).then((connection) => {
        console.log(`OracleDB Connected!!!`);
        return connection.execute(
            `SELECT * FROM ALI_SOCIAL_USER_TBL 
             WHERE ID = :id`,
             [data.googleId])
        .then((result) => {

            console.log("SELECT ALI_SOCIAL_USER_TBL RESULT : " + result.rows.length);

            if(result.rows.length < 1){
                return connection.execute(
                    `INSERT INTO ALI_SOCIAL_USER_TBL 
                    (USER_KEY,
                     ID, 
                     PW, 
                     FIRST_NAME, 
                     LAST_NAME, 
                     CONTACT, 
                     EMAIL, 
                     GENDER, 
                     CERTIFY_CODE,
                     CERTIFY_DATE, 
                     CERTIFY_TOKEN, 
                     IMAGE)
                     VALUES
                     (ALI_COMMON_SEQ.NEXTVAL,
                      :googleId,
                      :name,
                      :givenName,
                      :name,
                      '',
                      :email,
                      '',
                      '',
                      sysdate,
                      '',
                      :imgeUrl
                      ) `,
                   [data.googleId, data.name, data.givenName, data.name, data.email, data.imgeUrl]
                )
            }
        })
        .then((result) => {
            console.log(result);
        })      
        .catch((err) => {
            console.error("ERROR" + err);
            return connection.close();
        })
    }).catch((err) => {
        console.error(err);
    });
};

module.exports = connectDB;