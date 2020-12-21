import React, { useEffect, useState, useContext } from "react";
// import io from 'socket.io-client';
import io from 'socket.io-client';
import Container from 'react-bootstrap/Container';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Button from 'react-bootstrap/Button';

import { useHistory } from "react-router-dom";

import {DisplayPlayerList, DisplayGameSettings, BlockModal} from "../utilities/lobbies.js"
import SocketContext from '../utilities/socket-context'

function Lobby() {
    // player list state
    const [playerList, setPlayerList] = useState([]);
    const [gameSettings, setGameSettings] = useState(null);
    const [playerName, setPlayerName] = useState('');
    const [dead, setDead] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [countDown, setCountDown] = useState({time: null, countdown: null});
    const [gameState, setGameState] = useState('');
    const [remain ,setRemain] = useState(0);
    
    // const token = fromCookie('game-token');
    const token = sessionStorage.getItem('game-token');
    const history = useHistory();

    // no token then return to homepage
    if (token == null) {
        history.push('/');
    }

    // let socket;
    const socket = useContext(SocketContext);
    
    useEffect(() => {
        socket.emit("go online", {token: token, class: 'player'});
    }, []);

    useEffect(() => {
        // when receiving a lobby list, update playerList state.
        // If not successful, return to home page.
        socket.on("lobby update", (data) => {
            if (data.success){
                // update list
                console.log(data);
                setPlayerList(data.users);
                for (const i in data.users) {
                    if (data.users[i].token == token) {
                        setPlayerName(data.users[i].name);
                        setDead(data.users[i].dead);
                        break;
                    }
                }
                setGameSettings(data.game_settings);
                setGameState(data.game_state);
            } else {
                // not authorised, return to index
                history.push('/');
            }
        });
    });


    useEffect(() => {
        if (socket){
            socket.on('change state', (data) => {
                if (data.state == 'game'){
                    history.push('/game');
                }
            });
        }
    });

    useEffect(() => {
        let timer;
        if (socket){
            socket.on("start game", (data) => {
                setCountDown(data);
                setShowModal(true);
            });
        }

        // calculate time until
        if (countDown.time != null && remain >= 0){
            timer = setInterval(()=>{
                const timeUntil = countDown.time + countDown.countdown*1000 - Date.now();  
                setRemain(Math.max(Math.floor(timeUntil / 1000), 0));
            }, 500);
        }
        
        return () => clearInterval(timer);
    }, [remain, countDown]);


    return(
        <Container>
            <Jumbotron className="Login-jumbo">
                <h1>Lobby</h1>
                <div>
                    Your name is {playerName}.
                    {dead &&
                        <div>
                            <p>You are dead :(</p>
                        </div>
                    }
                    { (gameState == "game" && !dead) &&
                        <div>
                            <p>
                            Looks like the game has started. Press the button below to join game.
                            </p>
                            <Button onClick={() => history.push('/game')}>
                                Join
                            </Button>
                            
                        </div>

                    }
                </div>
            </Jumbotron>
            <h4>Players</h4>
            <DisplayPlayerList list={playerList} className="Lobby-table"/>
            <h4>Game Settings</h4>
            <DisplayGameSettings settings={gameSettings}/>
            <BlockModal show={showModal} remainingTime={remain} countDown={countDown}/>
        </Container>
    );
}


export default Lobby;