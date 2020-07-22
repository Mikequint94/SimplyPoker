import React, { useState, useEffect } from 'react';
import './Chat.css';

const Chat = ({socket, roomId, volume}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const Messages = () => {
    const messageItems = messages.map((msgObj, idx) => {
      return <li style={{background: msgObj.color, color: msgObj.color === '#282c34' ? 'white' : 'black'}} key={'message'+idx}>{msgObj.msg}</li>
    })
    return (
      <div id="wrapper">
        <ul id="messages">{messageItems}</ul>
      </div>
    )
  };

  const playAudio = (dataKey, playVolume) => {
    const audio = document.querySelector(`audio[data-key="${dataKey}"]`);
    if(!audio) return;
    audio.volume = playVolume/100;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(_ => {
          // Automatic playback started!
      })
      .catch(error => {
          // Auto-play was prevented
          console.log(error);
      });
    }
  };

  useEffect(() => {
    socket.on(`chat message ${roomId}`, (msg, color) => {
        setMessages(oldMessages => [...oldMessages, {msg, color}]);
        let sliced = msg.slice(msg.length-16, msg.length);
        if (sliced === "joined the chat!") {
          playAudio('join', volume);
        } else if (sliced === "s left the chat!") {
          playAudio('leave', volume);
        } else {
          playAudio('chat', volume);
        }
      });
      return () => {
        socket.off(`chat message ${roomId}`);
      }
  }, [socket, roomId, volume]);

  const sendMessage = () => {
    if (message) {
      // socket.emit(`stop typing ${roomId}`, user);
      socket.emit(`chat message ${roomId}`, message);
      setMessage('');
    }
  };

  return (
    <div>
        {<Messages />}
        <input
            id="form"
            placeholder={'enter chat message'}
            type="text"
            name="chatInput"
            value={message}
            autoComplete="off"
            onKeyDown={(e) => {if (e.keyCode === 13) {sendMessage()}}}
            onChange={(e) => setMessage(e.target.value)}
        ></input>
    </div>
  );
}

export default Chat;
