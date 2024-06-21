# nodejs, express로 게시판 만들기

- 내 포스트를 게시, 수정, 삭제 할 수 있습니다.

<br/>

## templete engine: ejs

### style: css, bootstrap

### axios

<br/>

## mongoDB (비관계형)

<br/>

## 이미지 저장기능 : aws s3

<br/>

## session 방식의 auth : passport, bcrypt, connect-mongo, express-session

- 로그인 성공시 세션만들어주고, 브라우저쿠키에 저장 함 = passport.serializeUser()
- 유저가 서버요청 넣을 때 마다 함께 던지는 쿠키 확인 = passport.deserializeUser()
- 비밀번호 암호화 hashing은 bcrypt이용(salt+hash)
- 세션데이터의 DB저장은 connect-mongo이용
  <br/>

## 검색기능 : MongoDB search Index

<br/>

## 포스트 작성자와 채팅하기 : socket.io

<br/>

## 서버와 실시간 데이터 연결하기 : SSE + mongoDB change stream

<br/>

## 그외 환경변수 셋팅 : dovenv
