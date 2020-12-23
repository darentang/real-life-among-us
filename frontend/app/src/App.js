
import React, {useEffect, useState} from "react";
import Login from './components/Login.js'
import Lobby from './components/Lobby.js'
import Console from './components/Console.js'
import Game from './components/Game.js'
import Dev from './components/Dev.js'
import Vote from './components/Vote.js'
import EndGame from './components/EndGame.js'
import Connect from './components/Connect.js'

import Navbar from 'react-bootstrap/Navbar'
import Button from 'react-bootstrap/Button'

import SocketContext from './utilities/socket-context.js';
import io from 'socket.io-client';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  useHistory
} from "react-router-dom";

function App() {

  const [socket, setSocket] = useState(null);
  const [address, setAddress] = useState(null);

  const history = useHistory();
  

  useEffect(() => {
    if (sessionStorage.getItem('api-host') != null) {
      setSocket(io(sessionStorage.getItem('api-host')));
      console.log('connecting', socket);
    } 
  }, [address]);

  const logoutCallback = () => {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({class: 'player', token: sessionStorage.getItem('game-token')})
    };

    fetch(sessionStorage.getItem('api-host')+'api/delete', requestOptions);
      
    sessionStorage.removeItem('game-token');
    sessionStorage.removeItem('api-host');
    
    window.location.href = "/";
  }


  return (
    <div>
    <Navbar bg="primary" variant="dark" sticky="top">
        <Navbar.Brand>Imposter Tang</Navbar.Brand>
        <Navbar.Collapse className="justify-content-end">
            {(sessionStorage.getItem('api-host') == null) &&
              <Navbar.Text>
              Not Connected
              </Navbar.Text>
            }
            {(sessionStorage.getItem('api-host') != null) &&
              <div>
                <Navbar.Text style={{'marginRight': '2vh'}}>
                  Connected
                </Navbar.Text>
                <Button size="sm" variant="secondary" onClick={logoutCallback}>
                  Logout
                </Button>
              </div>
            }
        </Navbar.Collapse>
    </Navbar>
    <div className="main">
      {(sessionStorage.getItem('api-host') == null) &&
        <Connect setAddress={setAddress} />
      }
      {(sessionStorage.getItem('api-host') != null && socket != null) &&
      <SocketContext.Provider value={socket}>
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
        </SocketContext.Provider>
      }
      </div>
    </div>
  );
}

export default App;
