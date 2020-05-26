import React, { useState, useEffect } from 'react';
import { useHistory } from "react-router-dom";
import './Room.css';
import Chat from './Chat.js';
import Game from './Game.js';
const io = require('socket.io-client');

const Room = ({ match }) => {
  let history = useHistory();
  const { roomId } = match.params;
  if (roomId.length !== 4) {
    history.push(`/`)
  }
  if (roomId.toUpperCase() !== roomId) {
    history.push(`/${roomId.toUpperCase()}`);
  }

  const [socket, setSocket] = useState(null);
  const [usernameReady, setUsernameReady] = useState(false);
  
  const [allPlayers, setAllPlayers] = useState([]);
  useEffect(() => {
    setSocket(io.connect(`${window.location.origin}?roomId=${roomId}`));
  }, [roomId]);


  useEffect(() => {
    if (socket) {
      socket.on(`all users ${roomId}`, (usernames) => {
        setAllPlayers(usernames);
      });  
    }
  }, [socket, roomId]);
  
  return (
    <div className="room">
      { socket ? <Game roomId={roomId} socket={socket} setUsernameReady={setUsernameReady} usernameReady={usernameReady} players={allPlayers}/> : 
         <div>loading...</div>}
      { socket && usernameReady ? <Chat socket={socket} roomId={roomId}/> : null}
    </div>
  );
}

export default Room;
