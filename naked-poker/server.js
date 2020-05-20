let express = require("express");
const path = require('path');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);

let port = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  if (req.headers['x-forwarded-proto'] != 'https' && process.env.NODE_ENV === 'production') {
    res.redirect('https://'+req.hostname+req.url);
  } else {
    res.sendFile(path.join(__dirname+'/client/build/index.html'));
  }
});

let rooms = {'TEST': {
  allColors: ['#E8AA14', '#FF5714', '#EA6ED7', '#99FF14', '#D4FFA1' ],
  users: {
    'Cailin': {
      socketId: '12345',
      color: '#6EEB83'
     },
    'Logurt': {
      socketId: '098324923',
      color: '#c07dff'
     },
    'Ali': {
      socketId: '324234234',
      color: '#E4FF1A'
     }
  }
}};

const createDeck = () => {
  let deck = [];
  const suits = ['♥', '♠', '♣', '♦'];
  const values = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];

  for (let suit in suits) {
    for (let value in values) {
      deck.push(`${values[value]} ${suits[suit]}`);
    }
  }
  return deck;
};
const stackShuffle = (deck) => {
  let count = deck.length;
  while(count) {
      deck.push(deck.splice(Math.floor(Math.random() * count), 1)[0]);
      count -= 1;
  }
  return deck;
};
const resetAndMakeDeck = () => {
  // currentPlayer = '';
  // currentPlayerIdx = -1;
  let deck = createDeck();
  return stackShuffle(deck);
};

//shape of Rooms
// rooms: {
  // 'SUPF': {
  //   'allColors': ['color1', 'color2'],
  //   'allPlayers': ['mike', 'chy'],
  //   'pot': 0,
  //   'lastBetter': 'mike'
    //  'users': {
      //   'Mike': {
        //     socketId: socket.id,
        //     color: '#123456',
        //     cards: ['A H', '5 D'],
        //     chips: 10000,
        //     roundBet: 0
        //     role: 'D',
        //     folded: true (or key not present)
      //  }
  //   }
  // }
// }

io.on('connection', (socket) => {
  let user = null;
  
  const { roomId } = socket.handshake.query;
  if (!rooms[roomId]) {
    rooms[roomId] = {
      allColors: ['#6EEB83', '#c07dff', '#E4FF1A', '#E8AA14', '#FF5714', '#EA6ED7', '#99FF14', '#D4FFA1' ],
      users: {}
    };
  }
  let room = rooms[roomId];
  io.emit(`all users ${roomId}`, {users: Object.keys(room['users'])});

  socket.on(`set user ${roomId}`, (username) => {
    user = username;
    room['users'][user] = {};
    room['users'][user]['socketId'] = socket.id;
    room['users'][user]['color'] = room['allColors'].splice(Math.floor(Math.random()*room['allColors'].length), 1);
    room['users'][user]['roundBet'] = 0;
    io.emit(`all users ${roomId}`, {users: Object.keys(room['users'])});
    io.emit(`chat message ${roomId}`, user + " has joined the chat!", '#282c34');
  });

  socket.on(`chat message ${roomId}`, (chatMsg) => {
    console.log(room)
    io.emit(`chat message ${roomId}`, user + " : " + chatMsg, room['users'][user]['color']);
  });

  socket.on(`start game ${roomId}`, () => {
    const deck = resetAndMakeDeck();
    room['allPlayers'] = Object.keys(room['users']);
    room['pot'] = 0;
    let roles;
    if (room['allPlayers'].length > 2) {
      roles = ['D','Sm','Bg'];
    } else {
      roles = ['D','Bg'];
    }
    // TESTING ROLES to make me Sm
    // for (let i = 0; i < 2; i++) {
    //   room['allPlayers'].push(room['allPlayers'].shift());
    // }
    // END OF TESTING

    room['allPlayers'].forEach(user => {
      room.users[user].cards = deck.splice(0,2); 
      room.users[user].chips = 10000; 
      room.users[user].role = roles.shift(); 
    })
    io.emit(`start game ${roomId}`, room.users, room.allPlayers[1] || room.allPlayers[0]);
    io.emit(`chat message ${roomId}`, '~~~ ' + user + " has started a new game! ~~~", '#282c34');
  });
  socket.on(`bet ${roomId}`, (user, amount, stage = '') => {
    room.pot += amount;
    room.users[user].chips -= amount;
    room.users[user].roundBet += amount;
    const currentPlayerIdx = room.allPlayers.indexOf(user);
    let nextPlayer = room.allPlayers[(currentPlayerIdx + 1) % room.allPlayers.length];
    let raise = undefined;
    if (stage === 'raise') {
      raise = room.users[user].roundBet;
      room.lastBetter = user;
    } else if (stage === 'firstBet3P' || stage === 'smallBlind') {
      raise = room.users[user].roundBet;
      room.lastBetter = nextPlayer;
    } else if (stage === 'firstBet2P') {
      nextPlayer = user;
    } else if (!stage && nextPlayer === room.lastBetter) {
      stage = 'roundEnd';
    }
    console.log(room.lastBetter)
    io.emit(`update board ${roomId}`, room.users, room.pot, nextPlayer, stage, raise);
  });
  socket.on(`fold ${roomId}`, (user, stage = '') => {
    room.allPlayers = room.allPlayers.filter(player => player !== user);
    room.users[user].folded = true;
    const currentPlayerIdx = room.allPlayers.indexOf(user);
    const nextPlayer = room.allPlayers[(currentPlayerIdx + 1) % room.allPlayers.length];
    io.emit(`update board ${roomId}`, room.users, room.pot, nextPlayer, stage);
  });
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
    const disconnectedUser = Object.keys(room.users).filter(user => room.users[user].socketId === socket.id);
    delete room.users[disconnectedUser];

    io.emit(`all users ${roomId}`, {users: Object.keys(room.users)});
    if (user) {
      io.emit(`chat message ${roomId}`, user + " has left the chat.", '#282c34');
    }
  });
});

http.listen(port);
