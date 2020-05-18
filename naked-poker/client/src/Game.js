import React, { useState, useEffect } from 'react';
import './Game.css';

const Game = ({roomId, players, socket, user}) => {
  const [started, setStarted] = useState(false);
  const [playerCards, setPlayerCards] = useState(false);

  useEffect(() => {
    socket.on(`start game ${roomId}`, (users) => {
      setStarted(true);
      setPlayerCards(users);
      // playAudio('newGame');
    });
  }, [socket, roomId]);

  const PlayersList = () => {
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
    console.log(playerCards);
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
          </div>
        )
      }
  });
    return (
      <div>
        {playerHands}
      </div>
    )
  };
  useEffect(() => {
    socket.on(`start game ${roomId}`, (users) => {
      setPlayerCards(users);
      setStarted(true);
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
      <PlayersList/>
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
      Welcome to room {roomId}!
      { started && playerCards ? <div>
          <PlayerHands/>
        </div> : <StartModal />}
    </div>
  );
}

export default Game;
