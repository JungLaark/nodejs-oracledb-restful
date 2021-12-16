const express = require("express");
const oracledb = require("oracledb");
const route = express.Router();
const logger = require("../Helper/LogHelper");
const bodyParser = require("body-parser");
const requestIp = require("request-ip");
const moment = require("moment");
const config = require('../Helper/Config');

route.use(bodyParser.json());
route.use(bodyParser.urlencoded({ extended: true }));

const date = new Date();
const now = moment(date).format("YYYY-MM-DD HH:mm:ss");

route.get("/", (req, res, next) => {
  res.send("response with a resources");
});

route.get("/login", async (req, res, next) => {

  let id = req.query.id;
  let pw = req.query.pw;

  console.log("id : " + id + ", pw : " + pw);

  let connection;
  let returnCode;

  try {
    oracledb.autoCommit = true;

    connection = await oracledb.getConnection({
      user: config.dbconnection.user,
      password: config.dbconnection.password,
      connectString: config.dbconnection.connectString,
    });

    console.log("Client IP : " + requestIp.getClientIp(req));
    console.log(now);

    const result = await connection.execute(
      `SELECT *
      FROM ALI_USER_TBL
      WHERE ID = :id AND PW = :pw`,
      [id, pw]
    );

    console.log(result.rows);
    logger.debug(result.rows);

    if (result.rows.length > 0) {
      return res
        .status(200)
        .json({ message: "Login Success!!!", result : result.rows});
    } else {
      return res
        .status(406)
        .json({ });
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
  return returnCode;
});

module.exports = route;
