import React, { useState, useEffect } from 'react';
import Slider from '@material-ui/core/Slider';
import './Game.css';

const Game = ({roomId, players, socket, setUsernameReady, usernameReady}) => {
  // const smallBlind = 100;
  // const bigBlind = 2 * smallBlind;
  const [playerInfo, setPlayerInfo] = useState(false);
  const [dealerCards, setDealerCards] = useState([]);
  const [stage, setStage] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentBet, setCurrentBet] = useState(0);
  const [recentRaise, setRecentRaise] = useState(0);
  const [smallBlind, setSmallBlind] = useState(0);
  const [pot, setPot] = useState(0);
  const [potentialBet, setPotentialBet] = useState(0);
  const [errorMessage, setErrorMessage] = useState(false);
  const [welcomeText, setWelcomeText] = useState(`Welcome to room ${roomId}!`);
  const [user, setUser] = useState('');

  const setUserName = () => {
    if (players.indexOf(user) > -1) {
      setErrorMessage('Enter a unique player name');
    } else if (user) {  
      socket.emit(`set user ${roomId}`, user);
      setErrorMessage(false);
      setUsernameReady(true);
    }
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

  const PlayersJoiningList = () => {
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
  const getCardClass = (card) => {
    if (!card) {
      return 'card hidden';
    }
    let classes = 'card';
    if (['♥', '♦'].includes(card.slice(-1))) {
      classes += ' red';
    }
    // if (idx === length - 1) {
    //   classes += ' animate';
    // }
    return classes;
  };
  const getPlayerClass = (player, playerPosition) => {
    let classes = `playerSpace player${playerPosition}`;
    if (playerInfo[player].folded) {
      classes += ' folded';
    } else if (playerInfo[player].winner) {
      classes += ' winner'
    }
    return classes;
  };
  const rotatePlayers = () => {
    const numRotates = players.indexOf(user) ;
    let rotated = players;
    for (let i = 0; i < numRotates; i++) {
      rotated.push(rotated.shift());
    }
    return rotated;
  };
  const playerPositionMapper = {
    1: [1], // Just to keep game good for now and testing
    2: [1,3],
    3: [1,2,4],
    4: [1,2,3,4],
    5: [1,2,5,6,4]
  };
  const PlayerHands = () => {
    let rotatedPlayers = rotatePlayers();
    let playerPositions = playerPositionMapper[rotatedPlayers.length];
    const playerBoard = (player, idx, cards) => (
      <div className={getPlayerClass(player, playerPositions[idx])} key={`player${idx}`}>
        <div className='cards'>
          <div className={getCardClass(cards[0])}>
            {cards[0]}
          </div>
          <div className={getCardClass(cards[1])}>
            {cards[1]}
          </div>
        </div>
        <div className='playerName'>{player}</div>
        <div className='playerChips'>{playerInfo[player].chips}</div>
        <div className={playerInfo[player].role ? 'role' : 'noRole'}>{playerInfo[player].role}</div>
        <div className={(playerInfo[player].roundBet || playerInfo[player].handCombo) ? 'roundBet' : 'roundBet noBet'}>
          <div>{playerInfo[player].roundBet || playerInfo[player].handCombo}</div>
        </div>
      </div>
    );
    const playerHands = rotatedPlayers.map((player, idx) => {
      if (idx === 0 || (stage === 'reveal' && !playerInfo[player].folded)) {
        return(
          playerBoard(player, idx, playerInfo[player].cards)
        )
      } else {
        return(
          playerBoard(player, idx, ['',''])
        )
      }
  });
    return (
      <div id='playerHands'>
        {playerHands}
      </div>
    )
  };

  // useEffect(() => {
  //   if (roomId === 'TEST') {
  //     const interval = setInterval(() => {
  //       if (!currentPlayer || !playerInfo[currentPlayer]) { return;}
  //       console.log('calling with', currentPlayer);
  //       let callBet = currentBet - playerInfo[currentPlayer].roundBet;
  //       console.log(' does callbet work', callBet)
  //       socket.emit(`bet ${roomId}`, currentPlayer, callBet);
  //     }, 2000)
  //     return () => clearInterval(interval);
  //   }
  // }, [socket, roomId, currentPlayer, currentBet, playerInfo]);
 
  const callHand = (callBet) => {
    if (currentPlayer !== user || stage === 'reveal') {
      console.log('not your turn');
    } else {
      console.log('called hand')
      socket.emit(`bet ${roomId}`, user, callBet);
    }
  };
  const foldHand = () => {
    if (currentPlayer !== user || stage === 'reveal') {
      console.log('not your turn');
    } else {
      console.log('folded hand')
      socket.emit(`fold ${roomId}`, user);
    }
  };
  const raiseBet = (bet) => {
    if (currentPlayer !== user || stage === 'reveal') {
      console.log('not your turn');
    } else {
      console.log('raised hand to ', bet)
      socket.emit(`bet ${roomId}`, user, bet - playerInfo[user].roundBet, 'raise');
    }
  };

  const PlayerControls = () => {
    if (!playerInfo[user]) {return null};
    let classes = 'grayedOut';
    let callBet = currentBet - playerInfo[user].roundBet;
    if (currentPlayer === user && stage !== 'reveal') {
      classes = '';
    } else if (playerInfo[user].folded) {
      classes  = 'grayedOut folded';
      callBet = 0;
    }

    let minRaise = currentBet + recentRaise || 2 * smallBlind;
    if (currentBet === 2 * smallBlind && !recentRaise) {
      minRaise = 4 * smallBlind;
    }
    let maxRaise = playerInfo[user].chips + playerInfo[user].roundBet;
    let raiseWord = 'Raise To';
    if (minRaise > maxRaise) {
      minRaise = maxRaise;
      raiseWord = 'All In';
    }
    if (potentialBet === maxRaise ) {
      raiseWord = 'All In';
    }
    let callWord = 'Call';
    if (callBet >= playerInfo[user].chips) {
      callWord = 'All In';
      callBet = playerInfo[user].chips;
    }
    //if grayed out cant click
    // all in wording and logic
    return (
      <div className={classes} id='playerControls'>
        <div className={callBet ? 'control' : 'control grayedOut'} onClick={() => foldHand()}>Fold</div>
        <div className='control' onClick={() => callHand(callBet)}>{callBet ? `${callWord} ${callBet}` : 'Check'}</div>
        <div>
          <div className={playerInfo[user].chips > 0 && callWord === 'Call' ? 'control' : 'control grayedOut'} onClick={() => raiseBet(potentialBet)}>{playerInfo[user].chips > 0 && callWord === 'Call' ? `${raiseWord} ${potentialBet}` : 'Raise'}</div>
          { playerInfo[user].chips > 0 && callWord === 'Call' ? <Slider
            defaultValue={minRaise}
            step={2 * smallBlind}
            disabled={classes.startsWith('grayedOut')}
            marks
            min={minRaise}
            max={maxRaise}
            valueLabelDisplay="auto"
            onChangeCommitted={(e, val) => setPotentialBet(val)}
          /> : null}
        </div>
      </div>
    )
  };

  const TableCards = () => {
    const centerCards = dealerCards.map((card, idx) => (
      <div key={`card${idx}`} className={getCardClass(card)}>{card}</div>
    ))
    return (
      <div id='tableCards'>
        <div className='dealerCards'>{centerCards}</div>
        <div className='pot'>Pot: {pot}</div>
      </div>
    )
  };

  useEffect(() => {
    if (usernameReady) {
      socket.on(`start game ${roomId}`, (sPlayerInfo, sCurrentPlayer, sSmallBlind) => {
        console.log('start game', sPlayerInfo)
        const bigBlind = sSmallBlind * 2;
        setRecentRaise(bigBlind);
        if (sCurrentPlayer === user && sPlayerInfo[user].role === 'Sm') {
          socket.emit(`bet ${roomId}`, user, sSmallBlind, 'bigBlind');
        } else if (sCurrentPlayer === user) {
          console.log(user, ' big blind')
          socket.emit(`bet ${roomId}`, user, bigBlind, 'smallBlind');
        }
        playAudio('newgame');
        setDealerCards([]);
        setCurrentBet(bigBlind);
        setPotentialBet(2 * bigBlind);
        setSmallBlind(sSmallBlind);
        setCurrentPlayer(sCurrentPlayer);
        setPlayerInfo(sPlayerInfo);
        setStage(true);
      });
    }
  }, [socket, roomId, user, usernameReady]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`update board ${roomId}`, (sPlayerInfo, sCurrentPlayer, sStage, sCurrentBet, sSmallBlind, sRaisedAmount) => {
        console.log('update board', sPlayerInfo[user], sCurrentPlayer, sStage, sCurrentBet, sRaisedAmount);
        const bigBlind = 2 * sSmallBlind;
        if (sCurrentPlayer === user && !['bigBlind', 'smallBlind'].includes(sStage)) {
          playAudio('yourturn');
        }
        if (sStage === 'raise') {
          setCurrentBet(sCurrentBet);
          setPotentialBet(sCurrentBet + sRaisedAmount);
        } else if (sStage === 'bigBlind' && sCurrentPlayer === user && sPlayerInfo[user].roundBet === 0) {
          socket.emit(`bet ${roomId}`, user, bigBlind, 'firstBet3P');
        } else if (sStage === 'smallBlind' && sCurrentPlayer === user && sPlayerInfo[user].roundBet === 0) {
          socket.emit(`bet ${roomId}`, user, sSmallBlind, 'firstBet2P');
        } else if (sStage === 'roundEnd') {
          setCurrentBet(0);
          setPotentialBet(bigBlind);
        }
        setCurrentPlayer(sCurrentPlayer);
        setPlayerInfo(sPlayerInfo);
        console.log('raised amount', sRaisedAmount)
        setRecentRaise(sRaisedAmount);
      });
    }
  }, [socket, roomId, user, usernameReady]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`flip card ${roomId}`, (sDealerCards, nextPlayer, sPot) => {
        playAudio('flipcard');
        if (sPot) {
          setPot(sPot);
        }
        if (sDealerCards === 'done') {
          console.log('game over!!  everyone flip');
          setStage('reveal');
          if (user === nextPlayer) {
            socket.emit(`calculate win ${roomId}`);
          }
        } else {
          setDealerCards(sDealerCards);
        }
      });
    }
  }, [socket, roomId, user, usernameReady]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`win ${roomId}`, (sPlayerInfo, sPot, winner) => {
        playAudio('win');
        setCurrentPlayer('');
        setPlayerInfo(sPlayerInfo);
        setPot(sPot);
        if (user === winner) {
          socket.emit(`start game ${roomId}`);
        };
      });
    }
  }, [socket, roomId, user, usernameReady]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`rejoin game ${roomId}`, (sUser, sPlayerInfo, sPot, sCurrentPlayer, sDealerCards, sCurrentBet, sSmallBlind) => {
        if (sUser === user) {
          console.log(sUser, sPlayerInfo, sPot, sCurrentPlayer, sDealerCards, sCurrentBet, sSmallBlind);
          setPlayerInfo(sPlayerInfo);
          setPot(sPot);
          setCurrentPlayer(sCurrentPlayer);
          setCurrentBet(sCurrentBet);
          setDealerCards(sDealerCards);
          setPotentialBet(sCurrentBet * 2);
          setSmallBlind(sSmallBlind);
          setStage(true);
        }
      });
    }
  }, [socket, roomId, user, usernameReady]);
  useEffect(() => {
    socket.on(`disconnected player ${roomId}`, (sCurrentPlayer) => {
      setCurrentPlayer(sCurrentPlayer);
    });
  }, [socket, roomId]);

  const StartModal = () => {
    if (!usernameReady) {
      return (
        <div id="modal" className="modal">
        <h2>
          What is your name? 
        </h2>
        <div>
          <input
            placeholder={'enter name'}
            autoFocus
            type="text"
            name="username"
            maxLength="24"
            value={user}
            onKeyDown={(e) => {if (e.keyCode === 13) {setUserName()}}}
            onChange={(e) => setUser(e.target.value)}
          ></input>
          <button onClick={() => setUserName()}>Good to Go</button>
          { errorMessage ? <div className='errorMessage'>{errorMessage}</div> : null}
          <h3>Current Players:</h3>
          <PlayersJoiningList/>
        </div>
      </div> 
      )
    } else {
      return (
        <div id="modal" className="modal">
          <h3>
            Press start once everyone is ready!
            You can play with 2-5 players. <br />
            Current Players:  
          </h3>
          <PlayersJoiningList/>
          <div>
            <button onClick={() => {
              if (players.length > 1 && players.length < 6) {
                setErrorMessage(false);
                if (players.length === 5) {
                  setWelcomeText(`Room ${roomId}`);
                }
                socket.emit(`start game ${roomId}`, true);
              } else {
                setErrorMessage('Must have between 2 and 5 players to start game');
              }
              }}>Start</button>
          </div>
          { errorMessage ? <div className='errorMessage'>{errorMessage}</div> : null}
        </div>
      )
    }
  };
  
  return (
    <div className="game">
      { stage ? <span id='welcome'>{welcomeText}<br /></span> : <span>Invite friends to play with code: {roomId}<br /></span>}
      { stage && playerInfo ? <div id='blinds'>Blinds: {smallBlind}/{2 * smallBlind}<br/></div> : '' }
      { stage && playerInfo && currentPlayer ? <div id='currentPlayerMsg'>{currentPlayer}'s turn</div> : '' }
      { usernameReady && stage && playerInfo ? <div>
          <TableCards/>
          <PlayerHands/>
          <PlayerControls/>
        </div> : <StartModal />}
    </div>
  );
}

export default Game;
