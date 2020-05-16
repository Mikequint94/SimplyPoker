import React, { useState, useEffect } from 'react';
import './Room.css';
import Chat from './Chat.js';
const io = require('socket.io-client')
const socket = io.connect('http://localhost:3001')

const Room = ({ match }) => {
  const [username, setUsername] = useState('');
  const [usernameReady, setUsernameReady] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);

  const setUser = () => {
    socket.emit('set user', username);
    setUsernameReady(true);
  };

  const PlayerList = () =>(
    <div>
      Current Players: {allPlayers}
    </div>
  );

  useEffect(() => {
    socket.on('all users', (usernames) => {
      console.log(usernames);
      setAllPlayers(usernames.users);
    });  
  }, []);

  return (
    <div className="room">
      Welcome to room {match.params.roomId}!
      <div>
        { usernameReady ? <PlayerList /> : 
          <div id="modal" className="modal">
            <h1>
              What is your name? 
            </h1>
            <div>
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
            </div>
          </div> 
        }
      </div>
      {<Chat socket={socket} user={username}/>}
    </div>
  );
}

export default Room;
