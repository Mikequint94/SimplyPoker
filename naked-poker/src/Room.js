import React, { useState, useEffect } from 'react';
import './Room.css';
import Chat from './Chat.js';
const io = require('socket.io-client');

const Room = ({ match }) => {
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState(null);
  const [usernameReady, setUsernameReady] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const { roomId } = match.params;
  useEffect(() => {
    setSocket(io.connect(`http://localhost:3001?roomId=${roomId}`));
  }, [roomId]);

  const setUser = () => {
    socket.emit(`set user ${roomId}`, username);
    setUsernameReady(true);
  };

  const PlayerList = () =>(
    <div>
      Current Players: {allPlayers}
    </div>
  );

  useEffect(() => {
    if (socket) {
      socket.on(`all users ${roomId}`, (usernames) => {
        console.log(usernames);
        setAllPlayers(usernames.users);
      });  
    }
  }, [socket, roomId]);
  
  return (
    <div className="room">
      Welcome to room {roomId}!
      <div>
        { usernameReady ? <PlayerList /> : 
          <div id="modal" className="modal">
            <h1>
              What is your name? 
            </h1>
            { socket ? <div>
              <input
                placeholder={'enter name'}
                type="text"
                name="username"
                maxLength="24"
                value={username}
                onKeyDown={(e) => {if (e.keyCode === 13) {setUser()}}}
                onChange={(e) => setUsername(e.target.value)}
              ></input>
              <button onClick={() => setUser()}>Good to Go</button>
            </div> : <div>loading...</div>}
          </div> 
        }
      </div>
      { socket ? <Chat socket={socket} roomId={roomId} user={username}/> : null}
    </div>
  );
}

export default Room;
