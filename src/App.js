import './App.css';
import { useState, useRef } from 'react';

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

  // calculates the time left on the display
  let timeLeft;
  if (timerState == 1) {
    // if timer has started, this time left counts down from the starting time
    const total = now - timerStart;
    timeLeft = Math.max(0, (timerLength - total));
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
    setTimerLength((sessionNext ? sessionLength : breakLength) * 60 * 1000);
    clearInterval(intervalRef.current);
  }

  function setSessionChange(sessionLen) {
    sessionLen = Math.max(1, sessionLen);
    setSessionLength(sessionLen);
    if (timerState == 0) {
      setTimerLength(sessionLen * 60 * 1000);
    }
  }

  function setBreakChange(sessionLen) {
    sessionLen = Math.max(1, sessionLen);
    setBreakLength(sessionLen);
    if (timerState == 0) {
      setTimerLength(sessionLen * 60 * 1000);
    }
  }

  return (
    <div className='PomodoroTimer'>
      <TimerView time={minutes + ":" + secondString} />
      <TimerFunctions started={timerState == 1} handleStart={handleStart} handlePause={handlePause} handleReset={handleReset} />
      <TimerSettings sessionLength={sessionLength} breakLength={breakLength} setSessionChange={setSessionChange} setBreakChange={setBreakChange} />
    </div>
  )
}

function TimerView({ time }) {
  return (
    <div className="TimerViewBox">
      <div className="TimerView">{time}</div>
    </div>
  )
}

function TimerFunctions({ started, handleStart, handlePause, handleReset }) {
  return (
    <div className='TimerFunctions'>
      <button className='TimerFunctionButton' onClick={started ? handlePause : handleStart}>{started ? "Pause" : "Start"}</button>
      <button className='TimerFunctionButton' onClick={handleReset}>Reset</button>
    </div>
  )
}

function TimerSettings({ sessionLength, breakLength, setSessionChange, setBreakChange }) {
  return (
    <div className="TimerSettings">
      <TimerSetting name="Session Length" time={sessionLength} setChange={setSessionChange} />
      <TimerSetting name="Break Length" time={breakLength} setChange={setBreakChange} />
    </div>
  )
}

function TimerSetting({ name, time, setChange }) {
  return (
    <div className="TimerSetting" >
      <button >{name}</button>
      <h3 className="LengthSetting" >{time} min</h3>
      <div className="SettingButtonView">
        <button className="SettingButton" onClick={() => setChange(time + 1)} >Up</button>
        <button className="SettingButton" onClick={() => setChange(time - 1)} >Down</button>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="Header">
      <h1 className="Header-title">Pomodoro Clock</h1>
      <button className="Header-themes">Change Theme{/*TODO*/}</button>
    </header>
  )
}
