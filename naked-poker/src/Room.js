import React, { useState } from 'react';
import './Room.css';

const Room = ({ match }) => {
  const [username, setUsername] = useState('');
  const [usernameReady, setUsernameReady] = useState(false);  

  const PlayerList = () =>(
    <div>
      Current Players: {username}
    </div>
  );

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
                onChange={(e) => setUsername(e.target.value)}
              ></input>
              <button onClick={() => setUsernameReady(true)}>Good to Go</button>
            </div>
          </div> 
        }
      </div>
    </div>
  );
}

export default Room;
