import React, { useState, useEffect } from 'react';
import './Game.css';

const Game = ({roomId, players}) => {
  // const [username, setUsername] = useState('');
  // const [socket, setSocket] = useState(null);
  // const [usernameReady, setUsernameReady] = useState(false);
  // const [allPlayers, setAllPlayers] = useState([]);
  // const { roomId } = match.params;
  // useEffect(() => {
  //   setSocket(io.connect(`http://localhost:3001?roomId=${roomId}`));
  // }, [roomId]);

  // const setUser = () => {
  //   socket.emit(`set user ${roomId}`, username);
  //   setUsernameReady(true);
  // };

  const PlayerList = () =>(
    <div>
      Current Players: {players}
    </div>
  );

  // useEffect(() => {
  //   if (socket) {
  //     socket.on(`all users ${roomId}`, (usernames) => {
  //       console.log(usernames);
  //       setAllPlayers(usernames.users);
  //     });  
  //   }
  // }, [socket, roomId]);
  
  return (
    <div className="game">
      Welcome to room {roomId}!
      This is the Game
      {<PlayerList/>}
    </div>
  );
}

export default Game;
