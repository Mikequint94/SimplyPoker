import React, { useState, useEffect } from 'react';
import './Game.css';

const Game = ({roomId, players, socket, user}) => {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    socket.on(`start game ${roomId}`, () => {
      setStarted(true);
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

  const StartModal = () => (
    <div id="modal" className="modal">
      <h2>
        Press start once everyone is ready!
        You can play with 2-5 players.
        Current Players:  
      </h2>
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
      { started ? <div>This is the Game</div> : <StartModal />}
    </div>
  );
}

export default Game;
