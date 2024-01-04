import './App.css';
import { useState, useRef } from 'react';

export default function App() {
  return (
    <div className="App">
      <Header />
      <PomodoroTimer/>
    </div>
  );
}

function PomodoroTimer() {
  const [timerState, setTimerState] = useState(0); // 0: reset, 1: started, 2: paused
  const [timerStart, setTimerStart] = useState(Date.now()); // original start time of timer
  const [timerLength, setTimerLength] = useState(25 * 60 * 1000); // default 25 minutes
  const [now, setNow] = useState(Date.now()); // needs now to update correctly
  const intervalRef = useRef(null);

  // calculates the time left on the display
  let timeLeft;
  if (timerState==1) {
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
  function handleStart()
  {
    // TODO: change timer start depending on the time left
    setTimerStart(Date.now());
    setTimerState(1);

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 10);
  }

  // function that runs when pause is pressed
  function handlePause()
  {
    setTimerState(2);
    setTimerLength(1000*Math.floor(timeLeft /  1000));
    clearInterval(intervalRef.current);
  }

  // function that runs when reset is pressed
  function handleReset()
  {
    setTimerState(0);
    setTimerLength((25*60+0)*1000);
    clearInterval(intervalRef.current);
  }

  return (
    <div className='PomodoroTimer'>
      <TimerView time={minutes + ":" + secondString}/>
      <TimerFunctions started={timerState==1} handleStart={handleStart} handlePause={handlePause} handleReset={handleReset}/>
      <TimerSettings />
    </div>
  )
}

function TimerView({time}) {
  return (
    <div className="TimerViewBox">
      <div className="TimerView">{time}</div>
    </div>
  )
}

function TimerFunctions({started, handleStart, handlePause, handleReset}) {
  return (
    <div>
      <button onClick={started ? handlePause : handleStart}>{started ? "Pause": "Start"}</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  )
}

function TimerSettings() {
  return (
    <div className="TimerSettings">
      <TimerSetting name="Session Length" time="25" />
      <TimerSetting name="Break Length" time="5" />
    </div>
  )
}

function TimerSetting({name, time}) {
  return (
    <div className="TimerSetting">
      <h4>{name}</h4>
      <h3>{time} minutes</h3>
      <button>Up</button>
      <button>Down</button>
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
