import React, { useState, useEffect, useRef } from 'react';
import Slider from '@material-ui/core/Slider';
import HelpBar from './HelpBar.js';
import VolumeBar from './Volume.js';
import './Game.css';

const Game = ({roomId, players, socket, setUsernameReady, usernameReady, volume, changeVolume}) => {
  const [playerInfo, setPlayerInfo] = useState(false);
  const [dealerCards, setDealerCards] = useState([]);
  const [stage, setStage] = useState(false);
  const [bettingAllowed, setBettingAllowed] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentBet, setCurrentBet] = useState(0);
  const [recentRaise, setRecentRaise] = useState(0);
  const [smallBlind, setSmallBlind] = useState(0);
  const [gameSettings, setGameSettings] = useState({blindsIncrease: false});
  const [pot, setPot] = useState(0);
  const [potentialBet, setPotentialBet] = useState(0);
  const [errorMessage, setErrorMessage] = useState(false);
  const [blinkUser, setBlinkUser] = useState('');
  const [welcomeText, setWelcomeText] = useState(`Welcome to room ${roomId}!`);
  const [user, setUser] = useState('');
  const reminderBeepTimeout = useRef(false);

  const setUserName = () => {
    if (players.indexOf(user) > -1) {
      setErrorMessage('Enter a unique player name');
    } else if (user) {  
      socket.emit(`set user ${roomId}`, user);
      setErrorMessage(false);
      setUsernameReady(true);
    }
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
    return classes;
  };
  const getPlayerClass = (player, playerPosition) => {
    let classes = `playerSpace player${playerPosition}`;
    if (playerInfo[player].folded) {
      classes += ' folded';
    } else if (playerInfo[player].winner) {
      classes += ' winner'
    } else if (currentPlayer === player && stage === true) {
      classes += ' active'
    }
    if (blinkUser === player) {
      classes += ' alert';
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
  let autoCheckAllInTimeout;
  let dealingTimeout;
  const callHand = (callBet, canClick) => {
    if (currentPlayer === user && bettingAllowed && stage !== 'reveal' && stage !== 'dealing' && canClick && !playerInfo[user].folded) {
      console.log('called hand')
      clearTimeout(reminderBeepTimeout.current);
      clearTimeout(autoCheckAllInTimeout);
      socket.emit(`bet ${roomId}`, user, callBet);
    }
  };
  const foldHand = (canClick) => {
    if (currentPlayer === user && bettingAllowed && stage !== 'reveal' && stage !== 'dealing' && canClick && !playerInfo[user].folded) {
      clearTimeout(reminderBeepTimeout.current);
      console.log('folded hand')
      socket.emit(`fold ${roomId}`, user);
    }
  };
  const raiseBet = (bet, canClick) => {
    if (currentPlayer === user && bettingAllowed && stage !== 'reveal' && stage !== 'dealing' && canClick && !playerInfo[user].folded) {
      clearTimeout(reminderBeepTimeout.current);
      console.log('raised hand to ', bet)
      socket.emit(`bet ${roomId}`, user, bet - playerInfo[user].roundBet, 'raise');
    }
  };

  const checkOthersAllIn = (player) => {
    return player === user || playerInfo[player].chips <= 0;
  }

  const PlayerControls = () => {
    if (!playerInfo[user]) {return null};
    let classes = 'grayedOut';
    let callBet = currentBet - playerInfo[user].roundBet;
    if (currentPlayer === user && stage !== 'reveal' && stage !== 'dealing' && bettingAllowed) {
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
    let modPotentialBet = potentialBet;
    if (potentialBet > maxRaise) {
      modPotentialBet = maxRaise;
    }
    if (minRaise > maxRaise) {
      minRaise = maxRaise;
      raiseWord = 'All In';
    }
    if (modPotentialBet === maxRaise ) {
      raiseWord = 'All In';
    }
    let callWord = 'Call';
    if (callBet >= playerInfo[user].chips) {
      callWord = 'All In';
      callBet = playerInfo[user].chips;
    }
    let raiseClass = 'control';
    if (playerInfo[user].chips <= 0 || callWord !== 'Call' || players.every(checkOthersAllIn)) {
      raiseClass = 'control grayedOut';
    }
    // all in wording and logic
    return (
      <div className={classes} id='playerControls'>
        <div className={callBet ? 'control' : 'control grayedOut'} onClick={() => foldHand(callBet)}>Fold</div>
        <div className={playerInfo[user].chips > 0 ? 'control' : 'control grayedOut'} onClick={() => callHand(callBet, playerInfo[user].chips > 0)}>{callBet ? `${callWord} ${callBet}` : 'Check'}</div>
        <div>
          <div className={raiseClass + ' raiseControl'} onClick={() => raiseBet(modPotentialBet, raiseClass === 'control')}>{playerInfo[user].chips > 0 && callWord === 'Call' ? `${raiseWord} ${modPotentialBet}` : 'Raise'}</div>
          { raiseClass === 'control' ? <div className="sliderDiv"><Slider
            defaultValue={minRaise}
            step={2 * smallBlind}
            disabled={classes.startsWith('grayedOut')}
            marks
            min={minRaise}
            max={maxRaise}
            valueLabelDisplay="auto"
            onChangeCommitted={(e, val) => setPotentialBet(val)}
          /></div> : null}
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
    if (stage && playerInfo[user] && playerInfo[user].chips === 0 && currentBet - playerInfo[user].roundBet === 0 && currentPlayer === user && stage !== 'reveal' && stage !== 'dealing' ) {
      // eslint-disable-next-line
      autoCheckAllInTimeout = setTimeout(() => {
        callHand(0, true);
      }, 500);
    }
    return () => clearTimeout(autoCheckAllInTimeout);
  }, [user, currentPlayer, stage, playerInfo, currentBet]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`deal hand ${roomId}`, (sPlayerInfo, sCurrentPlayer, sSmallBlind) => {
        console.log('deal hand', sPlayerInfo)
        const bigBlind = sSmallBlind * 2;
        setRecentRaise(bigBlind);
        if (sCurrentPlayer === user && sPlayerInfo[user].role === 'Sm') {
          socket.emit(`bet ${roomId}`, user, sSmallBlind, 'bigBlind');
        } else if (sCurrentPlayer === user) {
          console.log(user, ' big blind')
          socket.emit(`bet ${roomId}`, user, bigBlind, 'smallBlind');
        }
        playAudio('newgame', volume);
        setDealerCards([]);
        setCurrentBet(bigBlind);
        setPotentialBet(2 * bigBlind);
        setSmallBlind(sSmallBlind);
        setCurrentPlayer(sCurrentPlayer);
        setPlayerInfo(sPlayerInfo);
        setStage(true);
      });
    }
    return () => {
      socket.off(`deal hand ${roomId}`);
    }
  }, [socket, roomId, user, usernameReady, volume]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`update board ${roomId}`, (sPlayerInfo, sCurrentPlayer, sStage, sCurrentBet, sSmallBlind, sRaisedAmount) => {
        console.log('update board', sPlayerInfo[user], sCurrentPlayer, sStage, sCurrentBet, sRaisedAmount);
        const bigBlind = 2 * sSmallBlind;
        if (sCurrentPlayer === user && !['bigBlind', 'smallBlind'].includes(sStage) && !sPlayerInfo[user].winner) {
          playAudio('yourturn', volume);
          clearTimeout(reminderBeepTimeout.current);
          reminderBeepTimeout.current = setTimeout(() => {
            playAudio('hurryup', volume);
            socket.emit(`blink ${roomId}`, user);
          }, 15000);
          setBettingAllowed(true);
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
    return () => {
      clearTimeout(reminderBeepTimeout.current);
      socket.off(`update board ${roomId}`);
    }
  }, [socket, roomId, user, usernameReady, volume]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`flip card ${roomId}`, (sDealerCards, nextPlayer, sPot) => {
        playAudio('flipcard', volume);
        if (sPot) {
          setPot(sPot);
        }
        if (sDealerCards === 'done') {
          console.log('game over!!  everyone flip');
          clearTimeout(dealingTimeout);
          setStage('reveal');
          setBettingAllowed(false);
          clearTimeout(reminderBeepTimeout.current);
          if (user === nextPlayer) {
            socket.emit(`calculate win ${roomId}`);
          }
        } else {
          setStage('dealing');
          setDealerCards(sDealerCards);
          clearTimeout(dealingTimeout);
          // eslint-disable-next-line
          dealingTimeout = setTimeout(() => {
            setStage(true);
          }, 600);
        }
      });
    }
    return () => {
      clearTimeout(dealingTimeout);
      socket.off(`flip card ${roomId}`);
    }
  }, [socket, roomId, user, usernameReady, volume]);
  useEffect(() => {
    if (usernameReady) {
      socket.on(`win ${roomId}`, (sPlayerInfo, sPot, winner, reason = '') => {
        setBettingAllowed(false);
        clearTimeout(reminderBeepTimeout.current);
        playAudio('win', volume);
        setCurrentPlayer('');
        setPlayerInfo(sPlayerInfo);
        setPot(sPot);
        if (user === winner) {
          socket.emit(`deal hand ${roomId}`, false, reason);
        };
      });
    }
    return () => {
      socket.off(`win ${roomId}`);
    }
  }, [socket, roomId, user, usernameReady, volume]);
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
  useEffect(() => {
    socket.on(`update settings ${roomId}`, (newSettings) => {
      setGameSettings(newSettings);
    });
  }, [socket, roomId]);
  useEffect(() => {
    socket.on(`blink ${roomId}`, (user) => {
      console.log('blink user set: ', user);
      setBlinkUser(user)
      setTimeout(() => {
        setBlinkUser('');
      }, 1000);
    });
    return () => {
      socket.off(`blink ${roomId}`);
    }
  }, [socket, roomId]);

  const handleChangeSettings = (e) => {
    let newGameSettings = gameSettings;
    newGameSettings[e.target.name] = e.target.checked;
    setGameSettings(newGameSettings);
    socket.emit(`update settings ${roomId}`, newGameSettings);
  };

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
          <div className='settings'>
            <input
              name="blindsIncrease"
              type="checkbox"
              checked={gameSettings.blindsIncrease}
              onChange={handleChangeSettings}/>
              <label>Increase blinds over time?</label>
          </div>
          <div>
            <button onClick={() => {
              if (players.length > 1 && players.length < 6) {
                setErrorMessage(false);
                if (players.length === 5) {
                  setWelcomeText(`Room ${roomId}`);
                }
                socket.emit(`deal hand ${roomId}`, true);
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
      <VolumeBar volume={volume} changeVolume={changeVolume}/>
      { stage ? <span id='welcome'>{welcomeText}<br /></span> : <span>Invite friends to play with code: {roomId}<br /></span>}
      { stage && playerInfo ? <div id='blinds'>Blinds: {smallBlind}/{2 * smallBlind}<br/></div> : '' }
      { stage && playerInfo && currentPlayer ? <div id='currentPlayerMsg'>{currentPlayer}'s turn</div> : '' }
      { usernameReady && stage && playerInfo ? <div>
          <TableCards/>
          <PlayerHands/>
          <PlayerControls/>
          <HelpBar/>
        </div> : <StartModal />}
    </div>
  );
}

export default Game;
