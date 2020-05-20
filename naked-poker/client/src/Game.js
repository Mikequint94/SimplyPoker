import React, { useState, useEffect } from 'react';
import Slider from '@material-ui/core/Slider';
import './Game.css';

const Game = ({roomId, players, socket, user}) => {
  const [playerCards, setPlayerCards] = useState(false);
  const [stage, setStage] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentBet, setCurrentBet] = useState(200);
  const [pot, setPot] = useState(0);
  const [potentialBet, setPotentialBet] = useState(400);

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
    const playerHands = rotatedPlayers.map((player, idx) => {
      if (idx === 0) {
        const firstCard = playerCards[player].cards[0];
        const secondCard = playerCards[player].cards[1];
        return(
          <div className={getPlayerClass(player, playerPositions[idx])} key={`player${idx}`}>
            <div className='cards'>
              <div className={getCardClass(firstCard)}>
                {firstCard}
              </div>
              <div className={getCardClass(secondCard)}>
                {secondCard}
              </div>
            </div>
            <div className='playerName'>{player}</div>
            <div className='playerChips'>{playerCards[player].chips}</div>
            <div className={playerCards[player].role ? 'role' : 'noRole'}>{playerCards[player].role}</div>
            <div className='roundBet'>
              <div>{playerCards[player].roundBet}</div>
            </div>
          </div>
        )
      } else {
        return(
          <div className={getPlayerClass(player, playerPositions[idx])} key={`player${idx}`}>
            <div className='cards'>
              <div className='card hidden'></div>
              <div className='card hidden'></div>
            </div>
            <div className='playerName'>{player}</div>
            <div className='playerChips'>{playerCards[player].chips}</div>
            <div className={playerCards[player].role ? 'role' : 'noRole'}>{playerCards[player].role}</div>
            <div className='roundBet'>
              <div>{playerCards[player].roundBet}</div>
            </div>
          </div>
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
    if (currentPlayer !== user) {
      console.log('not your turn');
    } else {
      console.log('called hand')
      socket.emit(`bet ${roomId}`, user, callBet);
    }
  };
  const foldHand = () => {
    if (currentPlayer !== user) {
      console.log('not your turn');
    } else {
      console.log('folded hand')
      socket.emit(`fold ${roomId}`, user);
    }
  };
  const raiseBet = (bet) => {
    console.log(playerCards)
    if (currentPlayer !== user) {
      console.log('not your turn');
    } else {
      console.log('raised hand to ', bet)
      socket.emit(`bet ${roomId}`, user, bet - playerCards[user].roundBet, 'raise');
    }
  };
  const PlayerControls = () => {
    let classes = 'grayedOut';
    if (currentPlayer === user) {
      classes = ''
    }
    let callBet = currentBet - playerCards[user].roundBet;
    let minRaise = currentBet + 100;
    let maxRaise = playerCards[user].chips + playerCards[user].roundBet;
    if (currentBet) {
      // add rules around this confusing thing later. only the first bet per round the next has to double?
    }
    return (
      <div className={classes} id='playerControls'>
        <div className='control' onClick={() => foldHand()}>Fold</div>
        <div className='control' onClick={() => callHand(callBet)}>{callBet ? `Call ${callBet}` : 'Check'}</div>
        <div>
          <div className='control' onClick={() => raiseBet(potentialBet)}>Raise to {potentialBet}</div>
          <Slider
            defaultValue={minRaise}
            step={100}
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
    return (
      <div id='tableCards'>
        <div className='pot'>Pot: {pot}</div>
      </div>
    )
  };

  useEffect(() => {
    socket.on(`start game ${roomId}`, (sPlayerCards, sCurrentPlayer) => {
      if (sCurrentPlayer === user && sPlayerCards[user].role === 'Sm') {
        socket.emit(`bet ${roomId}`, user, 100, 'bigBlind');
      } else if (sCurrentPlayer === user) {
        socket.emit(`bet ${roomId}`, user, 200, 'smallBlind');
      }
      setCurrentPlayer(sCurrentPlayer);
      setPlayerCards(sPlayerCards);
      setStage(true);
      // playAudio('newGame');
    });
  }, [socket, roomId, user ]);
  useEffect(() => {
    socket.on(`update board ${roomId}`, (sPlayerCards, sPot, sCurrentPlayer, sStage, raise) => {
      if (sStage === 'raise') {
        setCurrentBet(raise);
        setPotentialBet(raise + 100);
      } else if (sStage === 'bigBlind' && sCurrentPlayer === user) {
        socket.emit(`bet ${roomId}`, user, 200, 'firstBet3P');
      } else if (sStage === 'smallBlind' && sCurrentPlayer === user) {
        setCurrentBet(200);
        setPotentialBet(200 + 100);
        socket.emit(`bet ${roomId}`, user, 100, 'firstBet2P');
        setCurrentBet(raise);
        setPotentialBet(raise + 100);
      } else if (sStage === 'roundEnd') {
        // console.log()
      }
      setCurrentPlayer(sCurrentPlayer);
      setPlayerCards(sPlayerCards);
      setPot(sPot);
      console.log(sStage, sCurrentPlayer)
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
          socket.emit(`start game ${roomId}`, user);
          }}>Start</button>
      </div>
    </div>
  );
  
  return (
    <div className="game">
      Welcome to room {roomId}!<br />
      { stage && playerCards ? 'Blinds: 100/200' : '' }<br/>
      { stage && playerCards ? `${currentPlayer}'s turn` : '' }
      { stage && playerCards ? <div>
          <TableCards/>
          <PlayerHands/>
          <PlayerControls/>
        </div> : <StartModal />}
    </div>
  );
}

export default Game;
