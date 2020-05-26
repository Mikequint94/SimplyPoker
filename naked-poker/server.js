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
  let deck = createDeck();
  return stackShuffle(deck);
};
const cardValueMapper = {
  '1': '10',
  'J': '11',
  'Q': '12',
  'K': '13',
  'A': '14'
};
const cardSuitMapper = {
  '♣': 1,
  '♦': 2,
  '♥': 4,
  '♠': 8
};
const handRankMapper = {
  1 : 'High Card',
  2: '1 Pair',
  3: '2 Pair',
  4: '3 of a Kind',
  5: 'Straight',
  6: 'Flush',
  7: 'Full House',
  8: '4 of a Kind',
  9: 'Straight Flush',
  10: 'Royal Flush'
}
const pokerHandRanking = [8, 9, 5, 6, 1, 2, 3, 10, 4, 7];
const evaluateHand = (cs, ss) => {
  var v,i,o,s = 1 << cs[0] | 1 << cs[1] | 1 << cs[2] | 1 << cs[3] | 1 << cs[4];
  for (i = -1, v = o = 0; i < 5; i++, o = Math.pow(2, cs[i] * 4)) {v += o * ((v / o & 15) + 1);}
  v = v % 15 - ((s / (s & -s) == 31) || (s == 0x403c) ? 3 : 1);
  v -= (ss[0] == (ss[1] | ss[2] | ss[3] | ss[4])) * ((s == 0x7c00) ? -5 : 1);
  return pokerHandRanking[v];
};

const combinations = (array) => {
  return new Array(1 << array.length).fill().map(
      (e1,i) => array.filter((e2, j) => i & 1 << j)).filter(a => a.length === 5);
};

const findHighestPairIdx = (bestHands) => {
  let bestPlayerIdx = new Set();
  let bestCard = '2';
  let comparingHands = [];
  bestHands.forEach((playerHands, playerIdx) => {
    playerHands.forEach((hand) => {
      let sortedHand = hand.sort();
      [0,1,2,3,].forEach(cardIdx => {
        if (sortedHand[cardIdx] === sortedHand[cardIdx + 1] && sortedHand[cardIdx] > bestCard) {
          bestCard = sortedHand[cardIdx];
          bestPlayerIdx = new Set([playerIdx]);
          console.log(sortedHand[cardIdx], bestCard, bestPlayerIdx)
        } else if (sortedHand[cardIdx] === sortedHand[cardIdx + 1] && sortedHand[cardIdx] === bestCard) {
          bestPlayerIdx.add(playerIdx);
          comparingHands.push(playerIdx);
          console.log(sortedHand[cardIdx], bestCard, bestPlayerIdx)
        }
      })
    });
  });
  if (bestPlayerIdx.size === 1) {
    return [...bestPlayerIdx][0];
  } else {
    return 'digDeeper';
  }
};

const findWinner = (overallBestHands, bestPlayers, bestCombo) => {
  if (bestPlayers.length === 1) {
    return bestPlayers[0];
  } else {
    if (bestCombo === '1 Pair' || bestCombo === '2 Pair') {
      return bestPlayers[findHighestPairIdx(overallBestHands)];
    }
  }
};
// console.log(findWinner(
//   [
//     [
//       [ '8', '4', '6', '9', '8' ],
//       [ '8', '4', '6', '13', '8' ],
//       [ '8', '4', '9', '13', '8' ],
//       [ '8', '6', '9', '13', '8' ],
//       [ '8', '4', '6', '2', '8' ],
//       [ '8', '4', '9', '2', '8' ],
//       [ '8', '6', '9', '2', '8' ],
//       [ '8', '4', '13', '2', '8' ],
//       [ '8', '6', '13', '2', '8' ],
//       [ '8', '9', '13', '2', '8' ]
//     ],
//     [
//       [ '9', '4', '6', '9', '8' ],
//       [ '9', '4', '9', '13', '8' ],
//       [ '9', '6', '9', '13', '8' ],
//       [ '9', '4', '9', '2', '8' ],
//       [ '9', '6', '9', '2', '8' ],
//       [ '9', '9', '13', '2', '8' ]
//     ]
//   ], ['mike','chy'], '1 Pair'))
// console.log(findWinner([[['4','6','6','8','8']],[['4','8','6','3','4'],['4','8','6','8','12']]], ['mike','chy'], '1 Pair'))
// console.log(findWinner([[['4','6','6','8','8']],[['5','6','6','3','5'],['8','2','2','8','9']]], ['mike','chy'], '2 Pair'))

let disconnectTimeOut;
let disconnectedUser = [];

//shape of Rooms
// rooms: {
  // 'SUPF': {
  //   'allColors': ['color1', 'color2'],
  //   'allPlayers': ['mike', 'chy', 'ali'],
  //   'roundPlayers': ['mike', 'chy'],
  //   'pot': 0,
  //   'lastBetter': 'mike',
  //   'currentPlayer': 'ali',
  //   'currentBet': 600,
  //   'smallBlind': 100,
  //   'dealerCards': ['4 ♠', '2 ♦', 'Q ♣', 'K ♣', '6 ♠'],
    //  'users': {
      //   'Mike': {
        //     socketId: socket.id,
        //     color: '#123456',
        //     cards: ['A H', '5 D'],
        //     chips: 10000,
        //     roundBet: 0
        //     role: 'D',
        //     folded: true || false
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
      users: {},
      allPlayers: [],
      smallBlind: 100
    };
  }
  let room = rooms[roomId];  
  
  io.emit(`all users ${roomId}`, Object.keys(room.users).filter(player => player !== disconnectedUser[0]));

  socket.on(`set user ${roomId}`, (username) => {
    user = username;
    if (user === disconnectedUser[0]) {
      clearTimeout(disconnectTimeOut);
      disconnectedUser = [];
    }
    if (!rooms[roomId]) {
      rooms[roomId] = {
        allColors: ['#6EEB83', '#c07dff', '#E4FF1A', '#E8AA14', '#FF5714', '#EA6ED7', '#99FF14', '#D4FFA1' ],
        users: {},
        allPlayers: [],
        smallBlind: 100
      };
    }
    if (!room.roundPlayers) {
      room.allPlayers.push(user);
      room.users[user] = {};
      room.users[user].socketId = socket.id;
      room.users[user].chips = 10000; 
      room.users[user].color = room.allColors.splice(Math.floor(Math.random()*room.allColors.length), 1);
      io.emit(`chat message ${roomId}`, user + " has joined the chat!", '#282c34');
    } else {
      if (!room.users[user]) {
        console.log(user, ' cant join in an active game. thy can watch?')
        io.emit(`rejoin game ${roomId}`, user, room.users, room.pot, room.currentPlayer, room.dealerCards, room.currentBet, room.smallBlind);
        return;
      };
      room.users[user].socketId = socket.id;
      io.emit(`chat message ${roomId}`, user + " has rejoined the chat :0", '#282c34');
      io.emit(`rejoin game ${roomId}`, user, room.users, room.pot, room.currentPlayer, room.dealerCards, room.currentBet, room.smallBlind);
    }
    io.emit(`all users ${roomId}`, Object.keys(room.users));
  });

  socket.on(`chat message ${roomId}`, (chatMsg) => {
    console.log(room)
    io.emit(`chat message ${roomId}`, user + " : " + chatMsg, room.users[user].color);
  });

  socket.on(`start game ${roomId}`, (firstGame = false) => {
    room.deck = resetAndMakeDeck();
    room.roundPlayers = room.allPlayers.slice();
    room.pot = 0;
    room.dealerCards = [];
    room.currentBet = room.smallBlind * 2;
    let roles;
    // rotate roles once each time
    room.allPlayers.push(room.allPlayers.shift());
    room.currentPlayer = room.roundPlayers[1] || room.roundPlayers[0];
    if (room.roundPlayers.length > 2) {
      roles = ['D','Sm','Bg'];
    } else {
      roles = ['D','Bg'];
    }
    room.roundPlayers.forEach(user => {
      room.users[user].roundBet = 0;
      room.users[user].cards = room.deck.splice(0,2); 
      room.users[user].role = roles.shift() || ''; 
      room.users[user].folded = false;
      room.users[user].winner = false;
      room.users[user].handCombo = '';
    })
    console.log(room.users);
    if (firstGame) {
      io.emit(`chat message ${roomId}`, '~~~ ' + user + " has started a new game! ~~~", '#282c34');
      io.emit(`start game ${roomId}`, room.users, room.currentPlayer, room.smallBlind);
    } else {
      setTimeout(() => {
        io.emit(`start game ${roomId}`, room.users, room.currentPlayer, room.smallBlind);
      }, 4500);
    }
  });
  socket.on(`bet ${roomId}`, (user, amount, stage = '') => {
    console.log(user, amount, stage);
    room.pot += amount;
    room.users[user].chips -= amount;
    room.users[user].roundBet += amount;
    const currentPlayerIdx = room.roundPlayers.indexOf(user);
    room.currentPlayer = room.roundPlayers[(currentPlayerIdx + 1) % room.roundPlayers.length];
    if (stage === 'raise') {
      room.lastBetter = user;
      room.currentBet = room.users[user].roundBet;
    } else if (stage === 'firstBet3P' || stage === 'smallBlind') {
      room.currentBet = room.users[user].roundBet;
      room.lastBetter = room.currentPlayer;
    } else if (stage === 'firstBet2P') {
      room.currentPlayer = user;
    } else if (!stage && room.currentPlayer === room.lastBetter) {
      stage = 'roundEnd';
      room.roundPlayers.forEach(player => {
        room.users[player].roundBet = 0;
      });
      if (!room.dealerCards.length) {
        // room.dealerCards = room.deck.splice(0,3);
        room.dealerCards = [...room.dealerCards, room.deck.pop()];
        io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer);
        setTimeout(() => {
          room.dealerCards = [...room.dealerCards, room.deck.pop()];
          io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer);
        }, 500);
        setTimeout(() => {
          room.dealerCards = [...room.dealerCards, room.deck.pop()];
          io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer);
        }, 1000);
      } else if (room.dealerCards.length === 3) {
        room.dealerCards = [...room.dealerCards, room.deck.pop()];
        io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer);
      } else if (room.dealerCards.length === 4) {
        room.dealerCards = [...room.dealerCards, room.deck.pop()];
        io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer);
      } else if (room.dealerCards.length === 5) {
        io.emit(`flip card ${roomId}`, 'done', room.currentPlayer);
      }
    }
    io.emit(`update board ${roomId}`, room.users, room.pot, room.currentPlayer, stage, room.currentBet, room.smallBlind);
  });
  socket.on(`fold ${roomId}`, (user, stage = '') => {
    console.log(room.roundPlayers)
    room.roundPlayers = room.roundPlayers.filter(player => player !== user);
    room.users[user].folded = true;
    console.log(room.roundPlayers, user)
    const currentPlayerIdx = room.roundPlayers.indexOf(user);
    room.currentPlayer = room.roundPlayers[(currentPlayerIdx + 1) % room.roundPlayers.length];
    if (room.lastBetter = user) {
      room.lastBetter = room.currentPlayer;
    }
    // maybe bugs here on play order after a fold check for 3+P!
    console.log(room.currentPlayer);
    if (room.roundPlayers.length === 1) {
      const winner = room.roundPlayers[0];
      room.users[winner].chips += room.pot;
      room.users[winner].winner = true;
      io.emit(`chat message ${roomId}`, `${winner} won ${room.pot} this round as the last player standing.`, '#282c34');
      room.pot = 0;
      io.emit(`win ${roomId}`, room.users, room.pot, winner);
    }
    io.emit(`update board ${roomId}`, room.users, room.pot, room.currentPlayer, stage);
  });
  socket.on(`calculate win ${roomId}`, () =>{
    let overallBestHands = [];
    let overallBestRank = 0;
    let bestPlayers = [];
    room.roundPlayers.forEach(player => {
      console.log('$$$', player, '$$$')
      const sevenCards = room.dealerCards.concat(room.users[player].cards);
      const fiveCardCombos = combinations(sevenCards);
      let bestRank = 0;
      let bestHands = [];
      fiveCardCombos.forEach(hand => {
        const allCardsCS = hand.map(card => cardValueMapper[card[0]] || card[0]);
        const allCardsSS = hand.map(card => cardSuitMapper[card[2]]);
        let handRank = evaluateHand(allCardsCS, allCardsSS);
        if (handRank > bestRank) {
          bestRank = handRank;
          bestHands = [allCardsCS];
        } else if (handRank === bestRank) {
          bestHands.push(allCardsCS);
        }
      });
      if (bestRank > overallBestRank) {
        overallBestRank = bestRank;
        bestPlayers = [player];
        overallBestHands = [bestHands];
      } else if (bestRank === overallBestRank) {
        bestPlayers.push(player);
        overallBestHands.push(bestHands);
      }
      room.users[player].handCombo = handRankMapper[bestRank];
    })
    console.log(overallBestHands)
    console.log(bestPlayers)
    console.log(handRankMapper[overallBestRank]);
    let winner = findWinner(overallBestHands, bestPlayers, handRankMapper[overallBestRank]) || bestPlayers[0]; //just doing this for testing
    room.users[winner].chips += room.pot;
    room.users[winner].winner = true;
    io.emit(`chat message ${roomId}`, `${winner} won ${room.pot} this round with a ${room.users[winner].handCombo}!`, '#282c34');
    room.pot = 0;
    io.emit(`win ${roomId}`, room.users, room.pot, winner);

  });

  socket.on('disconnect', () => {
    if (!user) {return;}
    if (room.roundPlayers && room.roundPlayers.length >= 2) {
      disconnectedUser = Object.keys(room.users).filter(user => room.users[user].socketId === socket.id);
      console.log(disconnectedUser, ' left, giving 10 sex')
      disconnectTimeOut = setTimeout(() => {
        delete room.users[disconnectedUser];
        room.allPlayers = room.allPlayers.filter(player => player !== disconnectedUser[0]);
        if (room.currentPlayer === disconnectedUser) {
          const currentPlayerIdx = room.roundPlayers.indexOf(disconnectedUser);
          room.currentPlayer = room.roundPlayers[(currentPlayerIdx + 1) % room.roundPlayers.length];      
          io.emit(`disconnected player ${roomId}`, room.currentPlayer);
          console.log('disconnected ', disconnectedUser);
        }
        if (room.lastBetter === disconnectedUser) {
          room.lastBetter = room.currentPlayer;
        }
        room.roundPlayers = room.roundPlayers.filter(player => player !== disconnectedUser[0]);
        io.emit(`all users ${roomId}`, room.allPlayers);
      }, 10000);
      
      if (user) {
        io.emit(`chat message ${roomId}`, user + " has left the chat.  If they do not rejoin within 15 seconds, they will be booted", '#282c34');
      }
    } else if (room.roundPlayers && room.roundPlayers.length === 1) {
      console.log('deleting roomId')
      delete rooms[roomId];
    } else {
      tempDisconnectedUser = Object.keys(room.users).filter(user => room.users[user].socketId === socket.id);
      delete room.users[tempDisconnectedUser];
      room.allPlayers = room.allPlayers.filter(player => player !== tempDisconnectedUser[0]);
      io.emit(`all users ${roomId}`, room.allPlayers);
    }
  });
});

http.listen(port);
