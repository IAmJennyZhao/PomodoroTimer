import './App.css';
import { useState } from 'react';

export default function App() {
  return (
    <div className="App">
      <Header />
      <PomodoroTimer/>
    </div>
  );
}

function PomodoroTimer() {
  const [timerStart, setTimerStart] = useState(Date.now());
  const [timerLength, setTimerLength] = useState(25 * 60 * 1000); // 25 minutes
  const [timerStarted, setTimerStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState([0, 0]);

  let seconds;
  let minutes;
  if (timerStarted)
  {
    const total = Date.now() - timerStart;
    // const remaining = Math.max(0, (timerLength - total));
    const remaining = (timerLength - total);
    console.log(remaining);
    seconds = Math.floor((remaining / 1000) % 60);
    minutes = Math.floor(total / 1000 / 60);
    setTimeLeft([minutes, seconds]);
  } else {
    seconds = Math.floor((timerLength / 1000)%60);
    minutes = Math.floor(timerLength / 1000 / 60);
  }
  let secondString = seconds.toString().padStart(2, '0');

  function handleStart()
  {
    setTimerStarted(true);
    // TODO: change timer start depending on the time left
    setTimerStart(Date.now());
    setTimerLength((minutes*60+seconds)*1000);
  }

  function handlePause()
  {
    setTimerStarted(false);
  }

  function handleEnd()
  {
    setTimerStarted(false);
  }

  return (
    <div className='PomodoroTimer'>
      <TimerView time={minutes + ":" + secondString}/>
      <TimerFunctions started={timerStarted} handleStart={handleStart} handlePause={handlePause} handleEnd={handleEnd}/>
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

function TimerFunctions({started, handleStart, handlePause, handleEnd}) {
  return (
    <div>
      <button onClick={started ? handlePause : handleStart}>{started ? "Pause": "Start"}</button>
      <button onClick={handleEnd}>End</button>
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
