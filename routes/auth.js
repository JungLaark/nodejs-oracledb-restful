const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const route = express.Router();
const oracleapp = require('../Helper/oracledb');
const logger = require('../Helper/LogHelper');


route.post('/google/client', (req, res) => {

    try{
        console.log(req.body);

        console.log(req.body.googleId);
        console.log(req.body.email);
        console.log(req.body.name);
        console.log(req.body.givenName);
        console.log(req.body.imgeUrl);

        //db에 넣어보자 
        oracleapp(req.body);

        res.status(200);
    }catch(err){
        logger.error("/auth/google/client 메소드에서 오류 " + err);
    }
});

module.exports = route;