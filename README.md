# nodejs, express

# ejs, css

# mongoDB

# session 방식의 auth : passport, bcrypt, connect-mongo

- 로그인 성공시 세션만들어주고, 브라우저쿠키에 저장 함 = passport.serializeUser()
- 유저가 서버요청 넣을 때 마다 함께 던지는 쿠키 확인 = passport.deserializeUser()
- 비밀번호 암호화 hashing은 bcrypt이용(salt+hash)
- 세션데이터의 DB저장은 connect-mongo이용

# 검색기능 : MongoDB search Index
