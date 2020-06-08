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
  allPlayers: ['Cailin', 'Ali', 'Logurt'],
  smallBlind: 100,
  users: {
    'Cailin': {
      socketId: '12345',
      color: '#6EEB83',
      chips: 10000
    },
    'Logurt': {
      socketId: '098324923',
      color: '#c07dff',
      chips: 10000
    },
    'Ali': {
      socketId: '324234234',
      color: '#E4FF1A',
      chips: 10000
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
  1: 'High Card',
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

const compareTwoHands = (sortedHand1, sortedHand2) => {
  if (!sortedHand1.length) {return sortedHand2;}
  for (let i = 0; i < 5; i++) {
    if (sortedHand1[i] > sortedHand2[i]) {
      return sortedHand1;
    } else if (sortedHand2[i] > sortedHand1[i]) {
      return sortedHand2;
    }
  }
  return sortedHand1;
};
const compareFinalHands = (bestHands) => {
  let bestPlayerIdxs = [...Array(bestHands.length).keys()];
  for (let i = 0; i < 5; i++) {
    if (bestPlayerIdxs.length === 1) {
      return bestPlayerIdxs;
    }
    let cards = [];
    for (let j = 0; j < bestPlayerIdxs.length; j++) {
      cards.push({val: bestHands[bestPlayerIdxs[j]][i], player: bestPlayerIdxs[j]});
    }
    cards = cards.sort((a,b) => b.val - a.val);
    console.log(cards);
    cards.forEach(card => {
      if (card.val < cards[0].val) {
        bestPlayerIdxs = bestPlayerIdxs.filter(player => player !== card.player);
      }
    })
  }
  return bestPlayerIdxs;
};

// console.log('Compare final ', compareFinalHands([[13,11,4,3,2], [13,11,4,3,9], [13,11,4,3,2], [13,11,4,3,9]]));
const handTypeMapper = {
  'High Card': 1,
  '1 Pair': 2,
  '2 Pair': 2,
  '3 of a Kind': 3,
  'Straight': 1,
  'Flush': 1,
  'Full House': 3,
  '4 of a Kind': 4,
  'Straight Flush': 1
}

const findHighestHandIdx = (bestHands, handType) => {
  const cardToCompare = handTypeMapper[handType] - 1;
  let bestPlayerIdx = new Set();
  let bestCard = '2';
  let comparingHands = Array.from(Array(bestHands.length), () => []);
  bestHands.forEach((playerHands, playerIdx) => {
    playerHands.forEach((hand) => {
      let sortedHand = hand.sort((a,b) => b-a);
      for (let i = 0; i < (5 - cardToCompare); i++) {
        if (sortedHand[i] === sortedHand[i + cardToCompare]) {
          if (sortedHand[i] > bestCard) {
            bestCard = sortedHand[i];
            bestPlayerIdx = new Set([playerIdx]);
            comparingHands = Array.from(Array(bestHands.length), () => []);
            comparingHands[playerIdx] = sortedHand;  
            // console.log(comparingHands)
          } else if (sortedHand[i] === bestCard) {
            bestPlayerIdx.add(playerIdx);
            comparingHands[playerIdx] = compareTwoHands(comparingHands[playerIdx], sortedHand);
            // console.log(comparingHands)
          }
          break;
        }
      }
    });
  });
  if (bestPlayerIdx.size === 1) {
    return [[...bestPlayerIdx][0]];
  } else {
    return compareFinalHands(comparingHands);
  }
};
const findWinner = (overallBestHands, bestPlayers, bestCombo) => {
  if (bestPlayers.length === 1) {
    return [bestPlayers[0]];
  } else {
    return findHighestHandIdx(overallBestHands, bestCombo).map(idx => bestPlayers[idx]);
  }
};
// console.log(findWinner(
//   [
//     [
//       [ 11, 12, 10, 8, 4 ],
//       [ 3, 13, 12, 11, 15 ]
//     ],
//     [
//       [ 9, 11, 14, 12, 8 ],
//       [ 13, 9, 15, 3, 8 ]
//     ]
//   ], ['mike', 'ali'], High Card'))
// console.log(findWinner([[[4,6,5,8,8]],[[4,8,6,3,4],[4,8,6,8,12]]], ['mike','chy'], '1 Pair'))
// console.log(findWinner([[[4,5,6,7,8]],[[4,5,6,7,8]],[[4,5,6,7,8]]], ['mike','chy', 'ali'], 'Straight'))
// console.log(findWinner([[[4,6,6,8,8]],[[5,6,6,3,5],[8,2,9,8,9]]], ['mike','chy'], '2 Pair'))
// console.log(findWinner([[[8,6,6,8,8]],[[5,6,6,5,5],[8,8,9,8,9]]], ['mike','chy'], 'Full House'))

let disconnectUserTimeOuts = {};

//shape of Rooms
// rooms: {
  // 'SUPF': {
  //   'allColors': ['color1', 'color2'],
  //   'allPlayers': ['mike', 'chy', 'ali'],
  //   'roundPlayers': ['mike', 'chy'],
  //   'pot': 0,
  //   'lastBetter': 'mike',
  //   'currentPlayer': 'ali',
  //   'roundStarter': 'playerLeftoDeala',
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
  
  io.emit(`all users ${roomId}`, Object.keys(room.users).filter(player => !disconnectUserTimeOuts[player]));

  const dealDealerCards = () => {
    room.roundPlayers.forEach(player => {
      room.pot += room.users[player].roundBet;
      room.users[player].roundBet = 0;
    });
    room.currentPlayer = room.roundStarter;
    room.lastBetter = room.roundStarter;
    if (!room.dealerCards.length) {
      room.dealerCards = [...room.dealerCards, room.deck.pop()];
      io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer, room.pot);
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
      io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer, room.pot);
    } else if (room.dealerCards.length === 4) {
      room.dealerCards = [...room.dealerCards, room.deck.pop()];
      io.emit(`flip card ${roomId}`, room.dealerCards, room.currentPlayer, room.pot);
    } else if (room.dealerCards.length === 5) {
      io.emit(`flip card ${roomId}`, 'done', room.currentPlayer, room.pot);
    }
  }

  socket.on(`set user ${roomId}`, (username) => {
    user = username;
    if (disconnectUserTimeOuts[user]) {
      clearTimeout(disconnectUserTimeOuts[user]);
      disconnectUserTimeOuts[user] = null;
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
    room.roundPlayers = room.allPlayers.slice().filter(user => room.users[user].chips > 0);
    if (room.roundPlayers.length === 1) {
      io.emit(`chat message ${roomId}`, '~!~!~! ' + room.roundPlayers[0] + " has won the game!! ~!~!~!", '#282c34');
      return;
    }
    room.pot = 0;
    room.dealerCards = [];
    room.currentBet = room.smallBlind * 2;
    let roles;
    // rotate roles once each time
    room.allPlayers.push(room.allPlayers.shift());
    room.currentPlayer = room.roundPlayers[1] || room.roundPlayers[0]; // So i can test by myself
    room.roundStarter = room.roundPlayers[1] || room.roundPlayers[0]; // So i can test by myself
    if (room.roundPlayers.length > 2) {
      roles = ['D','Sm','Bg'];
    } else {
      roles = ['D','Bg'];
    }
    room.allPlayers.slice().forEach(user => {
      if (room.users[user].chips <= 0) {
        room.users[user].folded = true;
        room.users[user].roundBet = 0;
        room.users[user].role = ''; 
        room.users[user].handCombo = '';
      }
    })
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
      dealDealerCards();
    }
    io.emit(`update board ${roomId}`, room.users, room.currentPlayer, stage, room.currentBet, room.smallBlind);
  });
  socket.on(`fold ${roomId}`, (user, stage = '') => {
    console.log(room.roundPlayers)
    const currentPlayerIdx = room.roundPlayers.indexOf(user);
    room.currentPlayer = room.roundPlayers[(currentPlayerIdx + 1) % room.roundPlayers.length];
    room.roundPlayers = room.roundPlayers.filter(player => player !== user);
    room.users[user].folded = true;
    if (room.roundStarter === user) {
      room.roundStarter = room.currentPlayer;
    }
    if (room.roundPlayers.length === 1) {
      const winner = room.roundPlayers[0];
      room.users[winner].chips += room.pot;
      room.users[winner].winner = true;
      io.emit(`chat message ${roomId}`, `${winner} won ${room.pot} this round as the last player standing.`, '#282c34');
      room.pot = 0;
      io.emit(`win ${roomId}`, room.users, room.pot, winner);
    } else if (room.currentPlayer === room.lastBetter) {
      stage = 'roundEnd';
      dealDealerCards();
    } else if (room.lastBetter === user) {
      room.lastBetter = room.currentPlayer;
    }
    console.log(`roundPlayers ${room.roundPlayers}, nextPlayer ${room.currentPlayer}, lastBetter ${room.lastBetter}`);
    io.emit(`update board ${roomId}`, room.users, room.currentPlayer, stage);
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
        const allCardsCS = hand.map(card => parseInt(cardValueMapper[card[0]]) || parseInt(card[0]));
        const allCardsSS = hand.map(card => cardSuitMapper[card[2]] || cardSuitMapper[card[3]]);
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
    let winnerArray = findWinner(overallBestHands, bestPlayers, handRankMapper[overallBestRank]) || bestPlayers[0]; //just doing this for testing
    if (winnerArray.length === 1) {
      const winner = winnerArray[0];
      room.users[winner].chips += room.pot;
      room.users[winner].winner = true;
      io.emit(`chat message ${roomId}`, `${winner} won ${room.pot} this round with a ${room.users[winner].handCombo}!`, '#282c34');
    } else {
      const splitPot = Math.floor(room.pot / winnerArray.length);
      winnerArray.forEach(winner => {
        room.users[winner].chips += splitPot;
        room.users[winner].winner = true;
        io.emit(`chat message ${roomId}`, `${winner} won ${splitPot} in a shared win with a ${room.users[winner].handCombo}!`, '#282c34');
      })
    }
    room.pot = 0;
    io.emit(`win ${roomId}`, room.users, room.pot, winnerArray[0]);
  });

  socket.on('disconnect', () => {
    console.log(disconnectUserTimeOuts);
    console.log(user);
    if (!user) {return;}
    if (room.roundPlayers && room.roundPlayers.length >= 2) {
      console.log(user, ' left, giving 15 sex')
      disconnectUserTimeOuts[user] = setTimeout(() => {
        delete room.users[user];
        room.allPlayers = room.allPlayers.filter(player => player !== user);
        console.log('disconnecting player from room: ', user)
        if (room.currentPlayer === user) {
          const currentPlayerIdx = room.roundPlayers.indexOf(user);
          room.currentPlayer = room.roundPlayers[(currentPlayerIdx + 1) % room.roundPlayers.length];      
          io.emit(`disconnected player ${roomId}`, room.currentPlayer);
          console.log('disconnected ', user);
        }
        if (room.lastBetter === user) {
          room.lastBetter = room.currentPlayer;
        }
        room.roundPlayers = room.roundPlayers.filter(player => player !== user);
        if (!room.roundPlayers.length) {
          console.log('deleting roomId')
          delete rooms[roomId];
        }
        io.emit(`all users ${roomId}`, room.allPlayers);
      }, 15000);
      
      if (user) {
        io.emit(`chat message ${roomId}`, user + " has left the chat.  If they do not rejoin within 15 seconds, they will be booted", '#282c34');
      }
    } else if (room.roundPlayers && room.roundPlayers.length === 1) {
      console.log('deleting roomId')
      delete rooms[roomId];
    } else {
      tempDisconnectedUser = user
      delete room.users[tempDisconnectedUser];
      room.allPlayers = room.allPlayers.filter(player => player !== user);
      io.emit(`all users ${roomId}`, room.allPlayers);
    }
  });
});

http.listen(port);
