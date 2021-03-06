import React, { useState } from 'react';
import { useHistory } from "react-router-dom";
import logo from './media/cardsgif.gif';
import './Home.css';

const Home = () => {

    let history = useHistory();
    const [room, setRoom] = useState('')

    const makeRoomId = () => {
        let result           = '';
        const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for ( let i = 0; i < 4; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    const createNewRoom = () => {
        const roomName = makeRoomId();
        history.push(`/${roomName}`)
    }
    const joinRoom = () => {
        if (room.length === 4) {
          history.push(`/${room.toUpperCase()}`)
        }
    }

  return (
    <div className="Home">
      <header className="Home-header">
        Welcome to Naked Poker
        <img src={logo} className="Home-logo" alt="logo" />
        <p>
          No BS. No Accounts. No bots. No spam. No frills.
        </p>
          ~Just Poker~
      </header>
      <div className="play-options">
        <div>
        <button onClick={createNewRoom}>Create New Room</button>
        </div>
        <div className="">
          <input
            placeholder={'code'}
            type="text"
            name="roomId"
            maxLength="4"
            value={room}
            onKeyDown={(e) => {if (e.keyCode === 13) {joinRoom()}}}
            onChange={(e) => setRoom(e.target.value)}
          ></input>
            <button onClick={joinRoom}>Join room</button>
        </div>
      </div>
    </div>
  );
}

export default Home;
