import React, { useState, useEffect } from 'react';
import './Game.css';

const Game = ({roomId, players, socket, user}) => {
  const [started, setStarted] = useState(false);
  const [playerCards, setPlayerCards] = useState(false);
  const [playersList, setPlayersList] = useState([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [playedBlinds, setPlayedBlinds] = useState(false);

  useEffect(() => {
    socket.on(`start game ${roomId}`, (users) => {
      setStarted(true);
      setPlayerCards(users);
      // playAudio('newGame');
    });
  }, [socket, roomId]);

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
  const rotatePlayers = () => {
    const numRotates = players.indexOf(user);
    let rotated = players;
    for (let i = 0; i < numRotates; i++) {
      rotated.push(rotated.shift());
    }
    return rotated;
  }
  const PlayerHands = () => {
    let rotatedPlayers = rotatePlayers();
    const playerHands = rotatedPlayers.map((player, idx) => {
      if (idx === 0) {
        const firstCard = playerCards[player].cards[0];
        const secondCard = playerCards[player].cards[1];
        return(
          <div className={`playerSpace player${idx+1}`} key={`player${idx}`}>
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
          </div>
        )
      } else {
        return(
          <div className={`playerSpace player${idx+1}`} key={`player${idx}`}>
            <div className='cards'>
              <div className='card hidden'></div>
              <div className='card hidden'></div>
            </div>
            <div className='playerName'>{player}</div>
            <div className='playerChips'>{playerCards[player].chips}</div>
            <div className='role'>{playerCards[player].role}</div>
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

  const callHand = () => {
    if (playersList[currentPlayerIdx] !== user) {
      console.log('not your turn');
    } else {
      console.log('called hand')
    }
  };

  const bet = (amount) => {
    console.log('bet ', amount);
  };

  const PlayerControls = () => {
    let classes = 'grayedOut';
    if (playersList[currentPlayerIdx] === user) {
      classes = ''
    }
    return (
      <div className={classes} id='playerControls'>
        <div>Fold</div>
        <div onClick={() => callHand()}>Call</div>
        <div>Raise</div>
      </div>
    )
  };

  useEffect(() => {
    if (playersList && currentPlayerIdx && playerCards) {
      const currentPlayer = playersList[currentPlayerIdx]
      if (playersList[currentPlayerIdx] !== user) {
        console.log('checking andnot your turn');
      } else {
        console.log('your turn');
        console.log(currentPlayer, playerCards);
        if (!playedBlinds && playerCards[currentPlayer].role === 'Bg') {
          bet(200);
          setPlayedBlinds(true);
        } else if (!playedBlinds && playerCards[currentPlayer].role === 'Sm') {
          bet(100);
          setPlayedBlinds(true);
        }
      }
    }
  }, [currentPlayerIdx, playersList, playedBlinds, user, playerCards]);

  useEffect(() => {
    socket.on(`start game ${roomId}`, (users, serverPlayersList, serverCurrentPlayerIdx) => {
      setPlayersList(serverPlayersList);
      setCurrentPlayerIdx(serverCurrentPlayerIdx);
      setStarted(true);
      setPlayerCards(users);
      // playAudio('newGame');
    });
  }, [socket, roomId]);

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
          setStarted(true);
          socket.emit(`start game ${roomId}`, user);
          }}>Start</button>
      </div>
    </div>
  )
  
  return (
    <div className="game">
      Welcome to room {roomId}!<br />
      { started && playerCards ? 'Blinds: 100/200' : '' }<br/>
      { started && playerCards ? `${playersList[currentPlayerIdx]}'s turn` : '' }
      { started && playerCards ? <div>
          <PlayerHands/>
          <PlayerControls/>
        </div> : <StartModal />}
    </div>
  );
}

export default Game;
