
import React from "react";
import Login from './components/Login.js'
import Lobby from './components/Lobby.js'
import Console from './components/Console.js'
import Game from './components/Game.js'
import Dev from './components/Dev.js'
import Vote from './components/Vote.js'
import EndGame from './components/EndGame.js'

import Navbar from 'react-bootstrap/Navbar'

import SocketContext from './utilities/socket-context.js';

import io from 'socket.io-client';


import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";


// const host = require("os").hostname() + ":5000";
const host = '192.168.0.28:5000';
// const socket_default = io(host, {'sync disconnect on unload': false });

function App() {
  sessionStorage.setItem('api-host', 'http://192.168.0.28:5000/');
  const socket = io(sessionStorage.getItem('api-host'));
  // socket.close();


  return (
    <SocketContext.Provider value={socket}>
      <Navbar bg="primary" variant="dark" sticky="top">
        <Navbar.Brand>Imposter Tang</Navbar.Brand>
      </Navbar>
      <div className="main">
        <Router>
          <Switch>
            <Route exact path="/">
              <Login />
            </Route>
            <Route path="/lobby">
              <Lobby />
            </Route>
            <Route path="/game">
              <Game />
            </Route>
            <Route path="/console">
              <Console />
            </Route>
            <Route path="/dev">
              <Dev />
            </Route>
            <Route path="/vote">
              <Vote />
            </Route>
            <Route path="/end">
              <EndGame />
            </Route>
          </Switch>
        </Router>
      </div>
    </SocketContext.Provider>
  );
}

export default App;
