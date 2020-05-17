import React, { useState, useEffect } from 'react';
import './Chat.css';

const Chat = ({socket, roomId, user}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  // const [typing, setTyping] = useState([]);
  // const messagesRef = useRef(messages);
  // const typingRef = useRef(typing);
  // useEffect(() => {
  //     messagesRef.current = messages;
  //     typingRef.current = typing;
  // });

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

  const playAudio = (dataKey) => {
    const audio = document.querySelector(`audio[data-key="${dataKey}"]`);
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
  };

  useEffect(() => {
    socket.on(`chat message ${roomId}`, (msg) => {
        setMessages(oldMessages => [...oldMessages, msg]);
        let sliced = msg.slice(msg.length-16, msg.length);
        if (sliced === "joined the chat!") {
          playAudio('join');
        } else if (sliced === "s left the chat!") {
          playAudio('leave');
        } else {
          playAudio('chat');
        }
      });
  }, [socket, roomId]);
  // useEffect(() => {
  //   socket.on(`typing ${roomId}`, (msg) => {
  //     let typingUser = msg.slice(0,-13);
  //     typingUser = typingUser.replace(/[_#.-\s]/g,'0');
  //     console.log(typingRef.current)
  //     if ( !typingRef.current.includes(typingUser) && user.replace(/[_#.-\s]/g,'0') !== typingUser) {
  //       setTyping(() => typingRef.current.push(typingUser));
  //       console.log(typingRef.current)
  //       setMessages(oldMessages => [...oldMessages, msg]);
  //       playAudio('typing');
  //     }
  //   });
  // }, [socket, roomId, user]);
  // useEffect(() => {
  //   socket.on(`stop typing ${roomId}`, (typingUser) => {
  //     typingUser = typingUser.replace(/[_#.-\s]/g,'0');
  //     console.log(typingRef.current)
  //     if (typingRef.current.includes(typingUser)) {
  //       const newTyping = typingRef.current.filter(user => user !== typingUser);
  //       console.log(newTyping)
  //       setTyping(() => newTyping);
        
  //       const newMessages = messagesRef.current.filter(msg => msg !== `${typingUser} is typing...`);
  //       // try without arrow
  //       console.log(newMessages);
  //       setMessages(() => newMessages);
  //     }
  //   });
  // }, [socket, roomId]);

  const sendMessage = () => {
    if (message) {
      // socket.emit(`stop typing ${roomId}`, user);
      socket.emit(`chat message ${roomId}`, message);
      setMessage('');
    }
  };

  // const isTyping = () => {
  //   if (message) {
  //     socket.emit(`typing ${roomId}`, user);
  //   } else {
  //     socket.emit(`stop typing ${roomId}`, user);
  //   }
  // };

  return (
    <div>
        {<Messages />}
        <input
            id="form"
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
