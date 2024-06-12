const express = require('express');
const app = express();

const dotenv = require('dotenv');
dotenv.config();

app.use(express.static(__dirname + '/public')); //public폴더안에 있는 파일들(css)을 html에서 가져다가 쓸수있게 함

app.set('view engine', 'ejs'); //ejs를 쓰겠다.

//user가 보낸 정보를 서버에서 쉽게 꺼내보기 위함
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//method-override 라이브러리 쓰겠다.
//form 태그로는 get,post만 가능해서 put,delete쓰기위해...
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const { MongoClient, ObjectId } = require('mongodb'); //mongoDB연결

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

app.get('/write', (요청, 응답) => {
  응답.render('write.ejs');
});

app.post('/add', async (request, response) => {
  //console.log(request.body);
  try {
    if (request.body.title === '' || request.body.content === '') {
      response.send('제목과 내용란에 무엇이든 적은 후 저장하세요');
    } else {
      await db.collection('post').insertOne({
        title: request.body.title,
        content: request.body.content,
        like: 0,
      });
      response.redirect('/list');
    }
  } catch (e) {
    console.log(e);
    response.status(500).send('서버에러남');
  }
});

app.get('/detail/:postId', async (req, res) => {
  try {
    let result = await db
      .collection('post')
      .findOne({ _id: new ObjectId(req.params.postId) });

    //console.log(result);
    //console.log(req.params);

    if (!result) {
      res.status(404).send('잘못된 경로로 접근함');
    } else {
      res.render('detail.ejs', { result: result });
    }
  } catch (e) {
    res.status(404).send('잘못된 경로로 접근함');
  }
});

app.get('/edit/:postId', async (req, res) => {
  let result = await db
    .collection('post')
    .findOne({ _id: new ObjectId(req.params.postId) });
  console.log(result);
  res.render('edit.ejs', { result });
});

app.put('/edit', async (req, res) => {
  try {
    if (req.body.title === '' || req.body.content === '') {
      res.send('제목과 내용란에 글을 기입한 후 수정버튼을 이용하세요');
    } else {
      let result = await db.collection('post').updateOne(
        { _id: new ObjectId(req.body.ID) }, //input에서 보내는 ID값으로 db정보 특정
        {
          $set: { title: req.body.title, content: req.body.content },
        }
      ); //updateOne({원래data}, $set:{바꿀data})
      if (result.matchedCount === 0) {
        //조건에 맞는 문서가 없으면
        return res
          .status(404)
          .send('수정하고자 하는 문서를 찾을 수 없습니다. ');
      }
      //console.log(result);
      res.redirect('/list');
    }
  } catch (e) {
    res.status(404).send('잘못된 경로로 접근함');
  }
});

app.put('/like', async (req, res) => {
  await db.collection('post').updateOne(
    { _id: new ObjectId(req.body.ID) },
    {
      $inc: { like: +1 },
    }
  ); //updateOne({원래data}, $inc:{like: -1}) ->더하기빼기
  //updateOne({원래data}, $mul{like: 2 }) -> 2곱하기
  //updateOne({원래data}, $unset{like }) -> like라는 필드값 삭제
  res.redirect('/list');
});

app.delete('/delete', async (req, res) => {
  //console.log(req.query); //url?key=value꺼내기
  try {
    if (!req.query.postId) {
      res.status(404).send('잘못된 요청입니다.');
    } else {
      await db
        .collection('post')
        .deleteOne({ _id: new ObjectId(req.query.postId) });

      res.status(200).send('글 삭제완료');
    }
  } catch (e) {
    res.status(500).send('글 삭제실패');
  }
});
