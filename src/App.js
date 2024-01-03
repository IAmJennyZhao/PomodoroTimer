import logo from './logo.svg';
import './App.css';

export default function App() {
  return (
    <div className="App">
      <Header />
    </div>
  );
}

function Header() {
  return (
    <header className="Header">
      <h1 className="Header-title">Pomodoro Clock</h1>
      <button className="Header-themes">Change Theme{/*TODO*/}</button>
    </header>
  )
}
