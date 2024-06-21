const router = require('express').Router();

/* 
//db 변수를 써야 하는 경우... 아래와 같이 불러와서 api내에서 쓰면됨

const connectDB = require('./../database.js');
let db;
connectDB
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum');
  })
  .catch((err) => {
    console.log(err);
  }); 
  
*/

router.get('/', async (req, res) => {
  //console.log(req.user);
  res.render('login.ejs', { user: req.user });
});

module.exports = router;
