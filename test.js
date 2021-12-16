//PROMISE 예시 
//test.js 
const test = () => {

    return new Promise((resolve, reject) => {
        ffmpeg(originFilePath)
        .toFormat('wav')
        .on('progress', (progress) => {
          console.log(`[ffmpeg] ${JSON.stringify(progress)}`);
        })
        .on('error', (err) => {
          console.log('파일 변환 중 에러가 발생했어요. : ' + err);
          reject();
        })
        .on('end', () => {
          console.log('파일 변환이 정상적으로 완료되었어요.');
          resolve();
        })
        .save(convertedFilePath);
    });
}
//resolve() 와 save() 에 duration이 존재한다. 


//app.js 
test().then(() => {
    //성공 
    console.log('success');
}).catch(() => {
    console.log('failed');
})