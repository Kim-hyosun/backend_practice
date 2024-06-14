const express = require('express');
const app = express();

const dotenv = require('dotenv');
dotenv.config();

const bcrypt = require('bcrypt'); //bcrypt셋팅

const MongoStore = require('connect-mongo'); //connect-mongo setting

app.use(express.static(__dirname + '/public')); //public폴더안에 있는 파일들(css)을 html에서 가져다가 쓸수있게 함

app.set('view engine', 'ejs'); //ejs를 쓰겠다.

//user가 보낸 정보를 서버에서 쉽게 꺼내보기 위함
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//method-override 라이브러리 쓰겠다.
//form 태그로는 get,post만 가능해서 put,delete쓰기위해...
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

//mongoDB
const { MongoClient, ObjectId } = require('mongodb');

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

//passpost 사용설정
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');

app.use(passport.initialize());
app.use(
  session({
    secret: '암호화에 쓸 비번',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }, //세션유효기간ms단위= 60 * 1000 = 60초
    store: MongoStore.create({
      //세션정보를 DB에 저장 connect-mongo
      mongoUrl: url,
      dbName: 'forum',
    }),
  })
);

app.use(passport.session());

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    try {
      let result = await db
        .collection('user')
        .findOne({ username: 입력한아이디 });

      if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' });
      }

      let hashCompare = await bcrypt.compare(입력한비번, result.password); //사용자 입력비번이랑, DB에 저장된 암호화된 비번 비교해주는 함수bcrypt.compare
      if (hashCompare) {
        return cb(null, result);
      } else {
        return cb(null, false, { message: '비번불일치' });
      }
    } catch (e) {
      console.log(e, '에러발생');
      res.status(500).send('로그인 실패');
    }
  })
); //입력아이디, 비번이 DB와 일치하는지 검증
//위 로직을 실행하려면 API안에서passport.authenticate('local')()호출

//위로직 성공실행되면 아래 로직도 함께 실행됨 ? 성공시 세션 생성
passport.serializeUser((user, done) => {
  //user에 로그인중인 유저 정보가 담김
  // console.log(user);
  process.nextTick(() => {
    //node.js에서 내부코드를 비동기처리해줌
    done(null, { id: user._id, username: user.username });
    //done의 2번째 파라미터가 세션에 담김
  });
});

//유저가 갖고있는 쿠키가 서버로 날아갈때 쿠키를 까서 비교하고 이상없으면, 현재 로그인된 유저정보를 알려줌
//서버의 api코드 안에서 요청.user하면 어디서든 유저정보 확인가능하게 해줌
passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection('user')
    .findOne({ _id: new ObjectId(user.id) }); //미리 db 조회해보고 최신user정보를 반환하기
  delete result.password; //비밀번호는 요청에 담기지 않도록
  process.nextTick(() => {
    done(null, result); //result가 요청.user에 들어감
  });
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

app.get('/list/:pagenum', async (요청, 응답) => {
  let result = await db
    .collection('post')
    .find()
    .skip((요청.params.pagenum - 1) * 5)
    .limit(5)
    .toArray();

  let allList = await db.collection('post').find().toArray();
  //console.log(result);

  응답.render('list.ejs', {
    postList: result,
    allPost: allList,
    pagenum: 요청.params.pagenum,
  });
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
  res.redirect(`/list/${req.body.pagenum}`);
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

app.get('/login', async (req, res) => {
  console.log(req.user);
  res.render('login.ejs');
});

app.post('/login', async (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    //err: 에러시정보, user: 성공시정보, info: 실패시정보
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);

    //성공하면 아래 코드 실행: 세션 만듦
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  })(req, res, next);
});

app.get('/register', (요청, 응답) => {
  응답.render('register.ejs');
});

//비밀번호는 hashing해서 DB에 저장함
app.post('/register', async (요청, 응답) => {
  let 해시 = await bcrypt.hash(요청.body.password, 10); //숫자는 해싱횟수
  //console.log(해시);

  await db.collection('user').insertOne({
    username: 요청.body.username,
    password: 해시,
  });
  응답.redirect('/');
});
