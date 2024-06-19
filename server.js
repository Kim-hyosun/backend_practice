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

//aws 셋팅
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const accessKey = process.env.s3_ACCESS_KEY;
const secretKey = process.env.s3_SECRET_KEY;
const s3 = new S3Client({
  region: 'ap-northeast-2', //서울
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'hyosun-bucket',
    key: function (요청, file, cb) {
      cb(null, `${Date.now().toString()}_${요청.file}`); //2번째 파라미터는 업로드시 파일명:Date.now().toString()
    },
  }),
});

//method-override 라이브러리 쓰겠다.
//form 태그로는 get,post만 가능해서 put,delete쓰기위해...
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

//mongoDB
const { MongoClient, ObjectId } = require('mongodb');

let db;
const url = process.env.MONGOKEY;
const PORT = process.env.PORT || 8080;
const connectDB = require('./database.js');

connectDB
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

// 미들웨어: 로그인 상태를 res.locals에 전달
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.user = req.user;
  next();
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
  //console.log(JSON.stringify(요청.user._id));
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
    USER: JSON.stringify(요청.user._id),
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

//미들웨어 upload.single('img') = input의 이름이 img가진 것이 들어오면 s3에 자동 업로드 해줌
//업로드 완료시에는 아래 API안에서 request.file로 이미지 URL 꺼낼수 있음
//여러장 사진 받아올때는 upload.array('img', 3)와 같이 적고 request.files로 꺼내볼수있음
app.post('/add', async (request, response) => {
  //console.log(request.body);
  //upload.single('upload_img');
  //console.log(request.file);
  //console.log(request.user);

  try {
    // 이미지 업로드 처리하고 에러나는지 확인
    await new Promise((resolve, reject) => {
      upload.single('upload_img')(request, response, (err) => {
        if (err) {
          reject(err); // 이미지 업로드 실패 시 에러를 reject
        } else {
          resolve(); // 이미지 업로드 성공 시 resolve
        }
      });
    });

    //본문검증
    if (request.body.title === '' || request.body.content === '') {
      response.send('제목과 내용란에 무엇이든 적은 후 저장하세요');
    } else {
      await db.collection('post').insertOne({
        title: request.body.title,
        content: request.body.content,
        like: 0,
        img: request.file ? request.file.location : '',
        user: request.user._id,
        username: request.user.username,
      });
      response.redirect('/list/1');
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
      await db.collection('post').deleteOne({
        _id: new ObjectId(req.query.postId),
        user: new ObjectId(req.user._id),
      }); //두가지 조건을 만족해야 deleteOne실행됨

      res
        .status(200)
        .json({ message: '글 삭제완료', refresh: true, USER: req.user._id });
    }
  } catch (e) {
    res.status(500).send('글 삭제실패');
  }
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

//로그인 route
app.use('/login', require('./routes/login.js'));

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

app.get('/search', async (요청, 응답) => {
  //console.log(요청.query.val);
  let 검색조건 = [
    {
      $search: {
        index: 'title_index',
        text: { query: 요청.query.val, path: ['title', 'content'] },
      },
    },
    /* { $sort: {_id:1}정렬 },   { $skip: '몇개씩 스킵할지 숫자' },{ $limit: '몇개씩 가져올지 숫자' }, {$project: {title: 해당필드를 1이면 보여주세요, 0이면 숨겨주세요}}*/
  ];
  let result = await db
    .collection('post')
    .aggregate(검색조건) //[{조건1},{조건2}]
    .toArray(); //db에서 검색어와 일치하는 데이터를 찾음

  /*   
  let 검색성능평가1 = await db
    .collection('post')
    .find({ $text: { $search: 요청.query.val } })
    .explain('executionStats');  //인덱스로 검색

  let 검색성능평가2 = await db
    .collection('post')
    .find({ title: { $regex: 요청.query.val } })
    .explain('executionStats');//정규식으로 일치값 검색 

  console.log(검색성능평가1, 검색성능평가2);
    // totalDocsExamined : 검색값 도출위해 확인한 DB값 개수
    executionStages.stage : COLLSCAN이면 문제있음 - DB전부를 보고있다는 의미
  */
  응답.render('search.ejs', { postList: result, pagenum: 요청.params.pagenum });
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
    }
    res.redirect('/');
  });
});
