import React, { useState, useEffect } from 'react';
import './Chat.css';

const Chat = ({socket, roomId, user}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const Messages = () => {
    const messageItems = messages.map((msg, idx) => {
      return <li key={'message'+idx}>{msg}</li>
    })
    return (
      <div id="wrapper">
        <ul id="messages">{messageItems}</ul>
      </div>
    )
  };

  useEffect(() => {
    socket.on(`chat message ${roomId}`, (msg) => {
        console.log(msg)
        setMessages(oldMessages => [...oldMessages, msg]);
        // chatBox.scrollTo(0, msgBox.scrollHeight);
        let sliced = msg.slice(msg.length-16, msg.length);
        let audio;
        if (sliced === "joined the chat!") {
            audio = document.querySelector(`audio[data-key="join"]`);
        } else if (sliced === "s left the chat!") {
            audio = document.querySelector(`audio[data-key="leave"]`);
        } else {
            audio = document.querySelector(`audio[data-key="chat"]`);
        }
        if(!audio) return;
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
      });
  }, [socket, roomId]);

  const sendMessage = () => {
    // if (user && input.value.length > 0) {
    socket.emit(`chat message ${roomId}`, message);
    // socket.emit('stoptyping', user);
    // input.value = '';
    // } else if (input.value.length > 0){
    //   // login(input.value);
    //   socket.emit('set user', input.value);
    //   document.getElementById('title').className = "hidden2";
    //   document.getElementById('button').innerHTML = "Send";
    //   user = input.value;
    //   input.value = '';
    // }
    // return false;
  };

  return (
    <div id="chatBox">
        {<Messages />}
        <input
            placeholder={'enter chat message'}
            type="text"
            name="chatInput"
            value={message}
            onKeyDown={(e) => {if (e.keyCode === 13) {sendMessage()}}}
            onChange={(e) => setMessage(e.target.value)}
        ></input>
    </div>
  );
}

export default Chat;
