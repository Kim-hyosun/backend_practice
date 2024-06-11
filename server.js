const express = require('express');
const app = express();

const dotenv = require('dotenv');
dotenv.config();

app.use(express.static(__dirname + '/public')); //public폴더안에 있는 파일들(css)을 html에서 가져다가 쓸수있게 함

app.set('view engine', 'ejs'); //ejs를 쓰겠다.

const { MongoClient } = require('mongodb'); //mongoDB연결

let db;
const url = process.env.MONGOKEY;
const PORT = process.env.PORT || 8080;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum');

    app.listen(PORT, () => {
      //포트에 서버를 띄우라는 명령
      console.log(`http://localhost:${PORT} 에서 서버 실행중`);
    }); //DB연결되면 SERVER를 띄우자
  })
  .catch((err) => {
    console.log(err);
  });

app.get('/', (req, res) => {
  //index페이지 접속시
  res.sendFile(__dirname + '/index.html');
});

app.get('/news', (요청, 응답) => {
  //도메인/news페이지 접근시
  응답.send('오늘 비옴');
  //db.collection('post').insertOne({title : '어쩌구'})
});

app.get('/list', async (요청, 응답) => {
  let result = await db.collection('post').find().toArray();
  //console.log(result);

  응답.render('list.ejs', { postList: result });
  //응답으로 list.ejs를 보내고, ejs파일안에 db의 데이터를 보내라
  //응답은 1번만 처리 가능
});

app.get('/time', (요청, 응답) => {
  응답.render('time.ejs', { data: new Date() });
});
