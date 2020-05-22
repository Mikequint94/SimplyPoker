import React, { useState, useEffect } from 'react';
import Slider from '@material-ui/core/Slider';
import './Game.css';

const Game = ({roomId, players, socket, user}) => {
  const smallBlind = 100;
  const bigBlind = 2 * smallBlind;
  const [playerCards, setPlayerCards] = useState(false);
  const [dealerCards, setDealerCards] = useState([]);
  const [stage, setStage] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentBet, setCurrentBet] = useState(bigBlind);
  const [pot, setPot] = useState(0);
  const [potentialBet, setPotentialBet] = useState(2 * bigBlind);

  const PlayersJoiningList = () => {
    const playerMap = players.map((player, idx) => (
      <li key={`player${idx}`}>
        {idx+1}: ~{player}~
      </li>
    ));
    return (
      <ul>
        {playerMap}
      </ul>
    )
  };
  const getCardClass = (card) => {
    if (!card) {
      return 'card hidden';
    }
    let classes = 'card';
    if (['♥', '♦'].includes(card.slice(-1))) {
      classes += ' red';
    }
    return classes;
  };
  const getPlayerClass = (player, playerPosition) => {
    let classes = `playerSpace player${playerPosition}`;
    if (playerCards[player].folded) {
      classes += ' folded';
    }
    return classes;
  };
  const rotatePlayers = () => {
    const numRotates = players.indexOf(user);
    let rotated = players;
    for (let i = 0; i < numRotates; i++) {
      rotated.push(rotated.shift());
    }
    return rotated;
  };
  const playerPositionMapper = {
    1: [1], // Just to keep game good for now and testing
    2: [1,3],
    3: [1,2,4],
    4: [1,2,3,4]
  };
  const PlayerHands = () => {
    let rotatedPlayers = rotatePlayers();
    let playerPositions = playerPositionMapper[rotatedPlayers.length];
    const playerInfo = (player, idx, cards) => (
      <div className={getPlayerClass(player, playerPositions[idx])} key={`player${idx}`}>
        <div className='cards'>
          <div className={getCardClass(cards[0])}>
            {cards[0]}
          </div>
          <div className={getCardClass(cards[1])}>
            {cards[1]}
          </div>
        </div>
        <div className='playerName'>{player}</div>
        <div className='playerChips'>{playerCards[player].chips}</div>
        <div className={playerCards[player].role ? 'role' : 'noRole'}>{playerCards[player].role}</div>
        <div className={playerCards[player].roundBet ? 'roundBet' : 'roundBet noBet'}>
          <div>{playerCards[player].roundBet}</div>
        </div>
      </div>
    );
    const playerHands = rotatedPlayers.map((player, idx) => {
      if (idx === 0 || stage === 'reveal') {
        return(
          playerInfo(player, idx, playerCards[player].cards)
        )
      } else {
        return(
          playerInfo(player, idx, ['',''])
        )
      }
  });
    return (
      <div id='playerHands'>
        {playerHands}
      </div>
    )
  };

  const callHand = (callBet) => {
    if (currentPlayer !== user || stage === 'reveal') {
      console.log('not your turn');
    } else {
      console.log('called hand')
      socket.emit(`bet ${roomId}`, user, callBet);
    }
  };
  const foldHand = () => {
    if (currentPlayer !== user || stage === 'reveal') {
      console.log('not your turn');
    } else {
      console.log('folded hand')
      socket.emit(`fold ${roomId}`, user);
    }
  };
  const raiseBet = (bet) => {
    console.log(playerCards)
    if (currentPlayer !== user || stage === 'reveal') {
      console.log('not your turn');
    } else {
      console.log('raised hand to ', bet)
      socket.emit(`bet ${roomId}`, user, bet - playerCards[user].roundBet, 'raise');
    }
  };
  const PlayerControls = () => {
    let classes = 'grayedOut';
    if (currentPlayer === user && stage !== 'reveal') {
      classes = '';
    }
    let callBet = currentBet - playerCards[user].roundBet;
    let minRaise = currentBet + bigBlind;
    let maxRaise = playerCards[user].chips + playerCards[user].roundBet;
    if (currentBet) {
      // add rules around this confusing thing later. only the first bet per round the next has to double?
    }
    return (
      <div className={classes} id='playerControls'>
        <div className={callBet ? 'control' : 'control grayedOut'} onClick={() => foldHand()}>Fold</div>
        <div className='control' onClick={() => callHand(callBet)}>{callBet ? `Call ${callBet}` : 'Check'}</div>
        <div>
          <div className='control' onClick={() => raiseBet(potentialBet)}>Raise to {potentialBet}</div>
          <Slider
            defaultValue={minRaise}
            step={bigBlind}
            disabled={classes === 'grayedOut'}
            marks
            min={minRaise}
            max={maxRaise}
            valueLabelDisplay="auto"
            onChangeCommitted={(e, val) => setPotentialBet(val)}
          />
        </div>
      </div>
    )
  };

  const TableCards = () => {
    const centerCards = dealerCards.map((card, idx) => (
      <div key={`card${idx}`} className={getCardClass(card)}>{card}</div>
    ))
    return (
      <div id='tableCards'>
        <div className='dealerCards'>{centerCards}</div>
        <div className='pot'>Pot: {pot}</div>
      </div>
    )
  };

  useEffect(() => {
    socket.on(`start game ${roomId}`, (sPlayerCards, sCurrentPlayer) => {
      if (sCurrentPlayer === user && sPlayerCards[user].role === 'Sm') {
        socket.emit(`bet ${roomId}`, user, smallBlind, 'bigBlind');
      } else if (sCurrentPlayer === user) {
        socket.emit(`bet ${roomId}`, user, bigBlind, 'smallBlind');
      }
      setDealerCards([]);
      setCurrentBet(bigBlind);
      setPotentialBet(2 * bigBlind);
      setCurrentPlayer(sCurrentPlayer);
      setPlayerCards(sPlayerCards);
      setStage(true);
      // playAudio('newGame');
    });
  }, [socket, roomId, user,bigBlind ]);
  useEffect(() => {
    socket.on(`update board ${roomId}`, (sPlayerCards, sPot, sCurrentPlayer, sStage, raise) => {
      if (sStage === 'raise') {
        setCurrentBet(raise);
        setPotentialBet(raise + bigBlind);
      } else if (sStage === 'bigBlind' && sCurrentPlayer === user) {
        socket.emit(`bet ${roomId}`, user, bigBlind, 'firstBet3P');
      } else if (sStage === 'smallBlind' && sCurrentPlayer === user) {
        setCurrentBet(bigBlind);
        setPotentialBet(bigBlind * 2);
        socket.emit(`bet ${roomId}`, user, smallBlind, 'firstBet2P');
        setCurrentBet(raise);
        setPotentialBet(raise + bigBlind);
      } else if (sStage === 'roundEnd') {
        setCurrentBet(0);
        setPotentialBet(bigBlind);
      }
      setCurrentPlayer(sCurrentPlayer);
      setPlayerCards(sPlayerCards);
      setPot(sPot);
    });
  }, [socket, roomId, user, bigBlind]);
  useEffect(() => {
    socket.on(`flip card ${roomId}`, (sDealerCards, nextPlayer) => {
      if (dealerCards.length === 5) {
        console.log('game over!!  everyone flip');
        setStage('reveal');
        if (user === nextPlayer) {
          socket.emit(`calculate win ${roomId}`);
        }
      }
      if (!dealerCards.length) {
        setDealerCards(sDealerCards.slice(0, 3));
      } else {
        setDealerCards(sDealerCards.slice(0, dealerCards.length+1));
      }
    });
  }, [socket, roomId, dealerCards.length]);
  useEffect(() => {
    socket.on(`folded win ${roomId}`, (sPlayerCards, sPot, winner) => {
      setCurrentPlayer('');
      setPlayerCards(sPlayerCards);
      setPot(sPot);
      if (user === winner) {
        socket.emit(`start game ${roomId}`);
      }
    });
  }, [socket, roomId, user]);

  const StartModal = () => (
    <div id="modal" className="modal">
      <h3>
        Press start once everyone is ready!
        You can play with 2-5 players. <br />
        Current Players:  
      </h3>
      <PlayersJoiningList/>
      <div>
        <button onClick={() => {
          socket.emit(`start game ${roomId}`, true);
          }}>Start</button>
      </div>
    </div>
  );
  
  return (
    <div className="game">
      Welcome to room {roomId}!<br />
      { stage && playerCards ? `Blinds: ${smallBlind}/${bigBlind}` : '' }<br/>
      { stage && playerCards && currentPlayer ? `${currentPlayer}'s turn` : '' }
      { stage && playerCards ? <div>
          <TableCards/>
          <PlayerHands/>
          <PlayerControls/>
        </div> : <StartModal />}
    </div>
  );
}

export default Game;
