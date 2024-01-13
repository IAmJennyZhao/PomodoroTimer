import './App.css';
import { useState, useRef } from 'react';
import useSound from 'use-sound';
import timerStartButtonSFX from './sounds/click.mp3'
import timerSettingClickSFX from './sounds/tap.mp3'
import alarmSFX from './sounds/puppet music alarm.wav'

export default function App() {
  return (
    <div className="App">
      <Header />
      <PomodoroTimer />
    </div>
  );
}

function PomodoroTimer() {
  // parameters for timer display
  const [timerState, setTimerState] = useState(0); // 0: reset, 1: started, 2: paused
  const [timerStart, setTimerStart] = useState(Date.now()); // original start time of timer
  const [timerLength, setTimerLength] = useState(25 * 60 * 1000); // default 25 minutes
  const [now, setNow] = useState(Date.now()); // needs now to update correctly
  const intervalRef = useRef(null);

  // parameters for timer settings
  const [sessionLength, setSessionLength] = useState(25);
  const [breakLength, setBreakLength] = useState(5);
  const [sessionNext, setSessionNext] = useState(true);

  // sound effects  
  const [playClick] = useSound(
    timerStartButtonSFX, 
    {
      volume: 0.1
    }
  );
  
  const [playTapUp] = useSound(
    timerSettingClickSFX, 
    {
      volume: 0.1, 
      playbackRate: 1.2
    }
  );
  
  const [playTapDown] = useSound(
    timerSettingClickSFX, 
    {
      volume: 0.1,
      playbackRate: 0.8
    }
  );
  
  const [playAlarm] = useSound(
    alarmSFX, 
    {
      volume: 0.25
    }
  );

  // calculates the time left on the display
  let timeLeft;
  if (timerState == 1) {
    // if timer has started, this time left counts down from the starting time
    const total = now - timerStart;
    timeLeft = Math.max(0, (timerLength - total));

    // the timer has run out of time
    if (timeLeft==0) {
      setSessionNext(!sessionNext);

      playAlarm();

      setTimerState(0);
      // change sec to min TODO
      setTimerLength((!sessionNext ? sessionLength : breakLength) * 1000 + 1000);
      handleStart();
    }
  } else {
    // if the timer is paused or stopped, the timer displays the length of the timer 
    timeLeft = timerLength;
  }

  // convert time left into minutes and seconds
  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor(timeLeft / 1000 / 60);
  let secondString = seconds.toString().padStart(2, '0');

  // function that runs when start is pressed
  function handleStart() {
    setTimerStart(Date.now());
    setTimerState(1);

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 10);
  }

  // function that runs when pause is pressed
  function handlePause() {
    setTimerState(2);
    setTimerLength(1000 * Math.floor(timeLeft / 1000));

    clearInterval(intervalRef.current);
  }

  // function that runs when reset is pressed
  function handleReset() {
    setTimerState(0);
    // change sec to min TODO
    setTimerLength((sessionNext ? sessionLength : breakLength) * 1000);
    clearInterval(intervalRef.current);
  }

  function setSessionChange(sessionLen) {
    sessionLen = Math.max(1, sessionLen);
    setSessionLength(sessionLen);
    if (timerState == 0) {
      setTimerLength(sessionLen * 1000);
    } 
  }

  function setBreakChange(sessionLen) {
    sessionLen = Math.max(1, sessionLen);
    setBreakLength(sessionLen);
    if (timerState == 0) {
      // change sec to min TODO
      setTimerLength(sessionLen * 1000);
    }
  }

  return (
    <div className='PomodoroTimer'>
      <TimerView time={minutes + ":" + secondString} isSession={sessionNext}/>
      <TimerFunctions started={timerState == 1} handleStart={handleStart} handlePause={handlePause} handleReset={handleReset} playClick={playClick}/>
      <TimerSettings sessionLength={sessionLength} breakLength={breakLength} setSessionChange={setSessionChange} setBreakChange={setBreakChange} playTapUp={playTapUp} playTapDown={playTapDown} />
    </div>
  )
}

function TimerView({ time, isSession }) {
  return (
    <div className="TimerViewBox">
      <div className="TimerView">
        <p className="TimerTypeText">{isSession ? "Session Timer" : "Break Timer"}</p>
        <p className="TimerText">{time}</p>
      </div>
    </div>
  )
}

function TimerFunctions({ started, handleStart, handlePause, handleReset, playClick }) {
  return (
    <div className='TimerFunctions'>
      <button className='TimerFunctionButton' onClick={started ? handlePause : handleStart} onMouseDown={playClick} >{started ? "Pause" : "Start"}</button>
      <button className='TimerFunctionButton' onClick={handleReset} onMouseDown={playClick} >Reset</button>
    </div>
  )
}

function TimerSettings({ sessionLength, breakLength, setSessionChange, setBreakChange, playTapUp, playTapDown}) {
  return (
    <div className="TimerSettings">
      <TimerSetting name="Session Length" time={sessionLength} setChange={setSessionChange} playTapUp={playTapUp} playTapDown={playTapDown} />
      <TimerSetting name="Break Length" time={breakLength} setChange={setBreakChange} playTapUp={playTapUp} playTapDown={playTapDown} />
    </div>
  )
}

function TimerSetting({ name, time, setChange, playTapUp, playTapDown}) {
  return (
    <div className="TimerSetting" >
      <h2 >{name}</h2>
      <h3 className="LengthSetting" >{time} min</h3>
      <div className="SettingButtonView">
        <button className="SettingButton" onClick={() => setChange(time + 1)} onMouseDown={playTapUp} >Up</button>
        <button className="SettingButton" onClick={() => setChange(time - 1)} onMouseDown={playTapDown} >Down</button>
      </div>
    </div>
  )
}

function Header() {
  
  // sound effects
  const [playClick] = useSound(
    timerStartButtonSFX, 
    {
      volume: 0.25
    }
  );

  return (
    <header className="Header">
      <h1 className="Header-title">Pomodoro Clock</h1>
      <button className="Header-themes" onMouseDown={playClick}>Change Theme{/*TODO*/}</button>
    </header>
  )
}
