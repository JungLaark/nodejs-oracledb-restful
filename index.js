const express = require('express');
const app = express();
const fs = require('fs');
const logger = require('./Helper/LogHelper');
const bodyParser = require('body-parser');


//const fileConverter = require('./Helper/FileConverterHelper');
const userRouter = require('./routes/users');
const fileUploadRouter = require('./routes/upload');
const callListRouter = require('./routes/calllist');
const contactRouter = require('./routes/contact');
const noteRouter = require('./routes/note');
const renderingRouter = require('./routes/rendering');
const sttRouter = require('./routes/stt');
const chatListRouter = require('./routes/chatlist');
const authRouter = require('./routes/auth');
const noteInfoRouter = require('./routes/noteinfo');
const noteItemRouter = require('./routes/noteitem');

app.use(bodyParser.json());

const cors = require('cors');
//cors 방지 
app.use(cors({
  origin: '*'
}));

app.use('/users', userRouter);
app.use('/upload', fileUploadRouter);
app.use('/calllist', callListRouter);
app.use('/contact', contactRouter);
app.use('/note', noteRouter);
app.use('/rendering', renderingRouter);
app.use('/stt', sttRouter);
app.use('/chatlist', chatListRouter);
app.use('/auth', authRouter);
app.use('/noteinfo', noteInfoRouter);
app.use('/noteitem', noteItemRouter);

const port = 28100;
app.listen(port, () => {
    logger.debug('--------------------------------------------------');
    logger.debug('|              Start Express Server : 28100       |');
    logger.debug('--------------------------------------------------');
});