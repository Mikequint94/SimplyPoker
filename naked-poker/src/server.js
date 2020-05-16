let express = require("express");
let app = express();
// app.use("/css",express.static(__dirname + "/css"));
// app.use("/assets",express.static(__dirname + "/assets"));
// app.use("/scripts",express.static(__dirname + "/scripts"));
let http = require('http').Server(app);
let io = require('socket.io')(http);

let port = process.env.PORT || 3001;

// app.get('/', function(req, res){
//   if (req.headers['x-forwarded-proto'] != 'https' && process.env.NODE_ENV === 'production') {
//     res.redirect('https://'+req.hostname+req.url);
//   } else {
//     res.sendFile(__dirname.split('src')[0] + 'public/index.html');
//   }
// });

let rooms = {};

// let playerCards = {}; // ex. {'mike': 13, 'chy': 12}
// let currentPlayer = '';
// let currentPlayerIdx = -1;
// let deck = [];
// let startingCardNum = 13;

// let allColors = ['#6EEB83', '#911CFF', '#E4FF1A', '#E8AA14', '#FF5714', '#EA6ED7', '#99FF14' ];
// const getRandomColor = () => {
//   if (allColors.length > 0) {
//     return allColors.splice(Math.floor(Math.random()*allColors.length), 1);
//   } else {
//     allColors = ['#6EEB83', '#911CFF', '#E4FF1A', '#E8AA14', '#FF5714', '#EA6ED7', '#99FF14' ];
//     return ['#6EEA8D'];
//   }
// };
// const createDeck = () => {
//   let deck = [];
//   const suits = ['♥', '♠', '♣', '♦'];
//   const values = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];

//   for (let suit in suits) {
//     for (let value in values) {
//       deck.push(`${values[value]} ${suits[suit]}`);
//     }
//   }
//   return deck;
// };
// const stackShuffle = () => {
//   let count = deck.length;
//   while(count) {
//       deck.push(deck.splice(Math.floor(Math.random() * count), 1)[0]);
//       count -= 1;
//   }
// };
// const resetAndMakeDeck = () => {
//   currentPlayer = '';
//   currentPlayerIdx = -1;
//   deck = createDeck();
//   stackShuffle();
// };

io.on('connection', (socket) => {
  console.log(socket.handshake.query.roomId)
  let user = null;
  const { roomId } = socket.handshake.query;
  if (!rooms[roomId]) {
    rooms[roomId] = {};
  }
  io.emit(`all users ${roomId}`, {users: Object.values(rooms[roomId])});

  socket.on(`set user ${roomId}`, (username) => {
    user = username;
    rooms[roomId][socket.id] = user;
    io.emit(`all users ${roomId}`, {users: Object.values(rooms[roomId])});
    io.emit(`chat message ${roomId}`, user + " has joined the chat!");
  });

  socket.on(`chat message ${roomId}`, (chatMsg) => {
    io.emit(`chat message ${roomId}`, user + " : " + chatMsg);
  });

  socket.on(`typing ${roomId}`, (typer) => {
    io.emit(`typing ${roomId}`, typer + " is typing");
  });

  socket.on(`stop typing ${roomId}`, (typer) => {
    io.emit(`stop typing ${roomId}`, typer);
  });

  // socket.on('start new game', function(){
  //   playerCards = {}; 
  //   resetAndMakeDeck();
  //   gameColors = Object.assign({}, colors);
  //   Object.keys(gameColors).forEach((user) => {
  //       playerCards[user] = cheatStarts[user] || startingCardNum;
  //   })
  //   io.emit('start new round', deck, gameColors, playerCards);
  //   io.emit('chat message', {msg: '~~~ ' + user + " has started a new game! ~~~", color: 'white' });
  // });
  // socket.on('pick from deck', function(){
  //   io.emit('pick from deck');
  // });
  // socket.on('flip card', function(targetId, selection){
  //   io.emit('flip card', targetId, selection);
  // });
  // socket.on('discard card', function(){
  //   io.emit('discard card');
  // });
  // socket.on('start new round', function(){
  //   resetAndMakeDeck();
  //   io.emit('start new round', deck, gameColors, playerCards);
  // });
  // socket.on('win round', function(user){
  //   playerCards[user] -= 1;
  //   if (playerCards[user] === 0) {
  //     io.emit('win game', user);
  //   } else {
  //     io.emit('win round', user);
  //   }
  // });
  // socket.on('pick from discard', function(){
  //   io.emit('pick from discard');
  // });
  // socket.on('next turn', function(startingUser){
  //   const players = Object.keys(gameColors);
  //   currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
  //   if (startingUser) {
  //     currentPlayerIdx = players.indexOf(startingUser);
  //   }
  //   currentPlayer = players[currentPlayerIdx];
  //   io.emit('next turn', currentPlayer);
  // });

  // socket.on('colorChange', function(userColor){
  //   colors[userColor.user] = userColor.color;
  //   if (gameColors[userColor.user]) {
  //     gameColors[userColor.user] = userColor.color;
  //   }
  //   io.emit('all users', {users: Object.values(people), color: colors});
  //   io.emit('change board color', gameColors);
  // });

  socket.on('disconnect', () => {
    delete rooms[roomId][socket.id];
    io.emit(`all users ${roomId}`, {users: Object.values(rooms[roomId])});
    if (user) {
      io.emit(`chat message ${roomId}`, user + " has left the chat.");
    }
  });
});

http.listen(port);
