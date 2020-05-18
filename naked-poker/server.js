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

// let currentPlayer = '';
// let currentPlayerIdx = -1;


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
    //  'users': {
      //   'Mike': {
        //     socketId: socket.id,
        //     color: '#123456',
        //     cards: ['A H', '5 D'],
        //     chips: 10000
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
    room['users'][user]['color'] = room['allColors'].splice(Math.floor(Math.random()*room['allColors'].length), 1);;
    io.emit(`all users ${roomId}`, {users: Object.keys(room['users'])});
    io.emit(`chat message ${roomId}`, user + " has joined the chat!", '#282c34');
  });

  socket.on(`chat message ${roomId}`, (chatMsg) => {
    console.log(room)
    io.emit(`chat message ${roomId}`, user + " : " + chatMsg, room['users'][user]['color']);
  });

  // socket.on(`typing ${roomId}`, (typer) => {
  //   io.emit(`typing ${roomId}`, typer + " is typing...");
  // });
  
  // socket.on(`stop typing ${roomId}`, (typer) => {
  //   io.emit(`stop typing ${roomId}`, typer);
  // });

  socket.on(`start game ${roomId}`, () => {
    const deck = resetAndMakeDeck();
    Object.keys(room['users']).forEach(user => {
      room['users'][user]['cards'] = deck.splice(0,2); 
      room['users'][user]['chips'] = 10000; 
    })
    io.emit(`start game ${roomId}`, room['users']);
    io.emit(`chat message ${roomId}`, '~~~ ' + user + " has started a new game! ~~~", '#282c34');
  });
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
    const disconnectedUser = Object.keys(room['users']).filter(user => room['users'][user]['socketId'] === socket.id);
    delete room['users'][disconnectedUser];

    io.emit(`all users ${roomId}`, {users: Object.keys(room['users'])});
    if (user) {
      io.emit(`chat message ${roomId}`, user + " has left the chat.", '#282c34');
    }
  });
});

http.listen(port);
