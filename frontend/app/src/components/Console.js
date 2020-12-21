import React, { useEffect, useState, useContext } from "react";
// import io from 'socket.io-client';
import io from 'socket.io-client';

import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Button from 'react-bootstrap/Button';
import ProgressBar from 'react-bootstrap/ProgressBar';

import { useHistory } from "react-router-dom";
import SocketContext from '../utilities/socket-context'

import useTypingGame from "react-typing-game-hook";

import {
    DisplayConsoleList, 
    DisplayPlayerList, 
    DisplayGameSettings,
    EditGameSettings,
    BlockModal,
    MeetingTally,
    Timer,
    ReactorMeltdown
} from "../utilities/lobbies.js"


function MeetingRoom(props) {
    const duration = 5;
    // player list state
    const [playerList, setPlayerList] = useState([]);
    const [consoleList, setConsoleList] = useState([]);
    
    const [progress, setProgress] = useState({completed:0, total:1});
    const [showModal, setShowModal] = useState(false);
    const [countDown, setCountDown] = useState({time: null, countdown: null});
    
    const [gameSettings, setGameSettings] = useState(null);
    const [remain ,setRemain] = useState(duration);




    const handleStartGame = () => {
        
        // request options
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({token: token, duration: duration})
        };

        // send request to api
        fetch(sessionStorage.getItem('api-host')+'api/start_game', requestOptions)
            .then(response => response.json())
            .then(setShowModal(true));
    }

    
    // const token = fromCookie('game-token');
    const token = sessionStorage.getItem('game-token');
    const history = useHistory();

    const socket = props.socket;
    const gameState = props.gameState;

    // no token then return to homepage
    if (token == null) {
        history.push('/');
    }

    useEffect(() => {
        // send a go online signal and request user list
        socket.emit("go online", {token: token, class: 'console'});
    }, []);

    useEffect(() => {
        // when receiving a lobby list, update entityList state.
        // If not successful, return to home page.
        socket.on("lobby update", (data) => {
            if (data.success){
                // update list
                console.log(data);
                setPlayerList(data.users);
                setConsoleList(data.consoles);
                setGameSettings(data.game_settings);
                setProgress(data.task_status);
            } else {
                // not authorised, return to index
                history.push('/');
            }
        });
    });

    useEffect(() => {
        if (gameState == "game") {
            setShowModal(false);
        }
    }, [gameState]);


    useEffect(() => {
        let timer;
        if (socket) {
            socket.on("start game", (data) => {
                setCountDown(data);
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
                <h1>Meeting Room</h1>
                {gameState == 'lobby' && 
                <div>
                    <p>
                        When everyone is ready, press the button below to start the game. 
                        Make sure everyone agrees on the game settings.
                    </p>
                    <Button variant="primary" size="lg" onClick={handleStartGame}>
                        Start Game!
                    </Button>
                </div>
                }
                {gameState =='game' &&
                <div>
                    <p>
                        Game has started!
                    </p>
                    <Button variant="danger" size="lg" onClick={() => {
                        // request options
                        const requestOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({token: token, meeting_type: "emergency"})
                        };

                        // send request to api
                        fetch(sessionStorage.getItem('api-host')+'api/trigger_meeting', requestOptions);
                    }}>
                        Emergency Meeting!
                    </Button>
                </div>
                }
                {gameState == 'end' &&
                <div>
                    <p>The Game has Ended</p>
                    <Button onClick={() => {
                        const requestOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({token: token})
                        };

                        fetch(sessionStorage.getItem('api-host')+'api/reset', requestOptions);
                    }}>
                        Reset
                    </Button>
                </div>

                }
            </Jumbotron>
            <Row>
                <Col>
                    <div style={{'margin-top': '1vh', 'margin-bottom': '2vh'}}>
                        <h4>Task Progress</h4>
                        <p>{progress.completed} out of {progress.total} completed.</p>
                        <ProgressBar striped variant="success" now={Math.round(progress.completed/progress.total*100)}/>
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <h4>Players</h4>
                    <DisplayPlayerList list={playerList} editable={gameState == 'lobby' ? true : false} className="Lobby-table"/>
                </Col>
                <Col>
                    <h4>Consoles</h4>
                    <DisplayConsoleList list={consoleList} editable={gameState == 'lobby' ? true : false} className="Lobby-table"/>
                </Col>
            </Row>
            <Row>
                <Col>
                    <h4>Game Settings</h4>
                    <DisplayGameSettings settings={gameSettings}/>
                </Col>
                {gameState == 'lobby' && 
                    <Col>
                        <h4>Edit Game Settings</h4>
                        <EditGameSettings settings={gameSettings}/>
                        
                    </Col>
                }
            </Row>
            <BlockModal show={showModal} remainingTime={remain} countDown={countDown}/>
        </Container>

    );
}

function Reactor(props) {

    let text = "Giving directions that the mountains are to the west only works when you can see them.";
    const token = props.token;
    const {
        states: {
            charsState,
            currIndex,
            phase
        },
        actions: { insertTyping, resetTyping, deleteTyping }
        } = useTypingGame(text, {pauseOnError: false});

    const handleKey = (key) => {
        if (key === "Escape") {
            resetTyping();
        } else if (key === "Backspace") {
            deleteTyping(false);
        } else if (key.length === 1) {
            insertTyping(key);
        }
    };

    useEffect(() => {
        if (phase == 2) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({token: token})
            };

            // send request to api
            fetch(sessionStorage.getItem('api-host')+'api/save_core', requestOptions);
        }
    }, [phase]);

    useEffect(() => {
        props.socket.on("reactor update", (data) => {
            if (data.reactor_state == "trigger") {
                resetTyping();
            }
        });
    });
    return (
        <Container>
            <Jumbotron>
                <h1>Reactor</h1>
                <p>Status: {props.reactorStatus.reactor_state}.</p>
            </Jumbotron>
            {props.reactorStatus.reactor_state != 'normal' &&
            <div>
                <Row style={{margin: '2vh'}}>
                    <Col>
                        <ReactorMeltdown reactorStatus={props.reactorStatus}/>
                    </Col>
                </Row>
                <Row>
                    <Col>
                    <Card>
                        <Card.Header style={{'font-size': 'large'}}>Finish the typing test to fix the core!</Card.Header>
                        <Card.Body>
                            <div
                            onKeyDown={(e) => {
                                handleKey(e.key);
                                e.preventDefault();
                            }}
                            tabIndex={0}
                            style={{'font-size': 'x-large'}}
                            >
                                {text.split("").map((char, index) => {
                                    let state = charsState[index];
                                    let color = state === 0 ? "white" : state === 1 ? "green" : "red";
                                    return (
                                        <span
                                        key={char + index}
                                        style={{ color }}
                                        className={currIndex + 1 === index ? "curr-letter" : ""}
                                        >
                                        {char}
                                        </span>
                                    );
                                })}
                            </div>
                        </Card.Body>
                    </Card>
                    </Col>
                </Row>
            </div>
            }
        </Container>
    )
}

function Console() {
    const [gameState, setGameState] = useState('lobby');
    const [reactorStatus, setReactorStatus] = useState({'reactor_state': 'normal', 'passage': ''});
    const [showResults, setShowResults] = useState(false);
    const [result, setResult] = useState('');
    const [tally, setTally] = useState({tally: [], meeting_state: "discussion"});
    const token = sessionStorage.getItem('game-token');
    const [type, setType] = useState('Meeting Room');

    const history = useHistory();

    useEffect(() => {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({token: token})
        };

        fetch(sessionStorage.getItem('api-host')+'api/player_profile', requestOptions).then(response => response.json()).then((data) => {
            if (data.success) {
                setType(data.console_type);
            } else {
                history.push('/');
            }
        });
    }, [])

    useEffect(() => {
        socket.on("meeting update", (data) => {
            setTally(data);
            console.log(data);
        });
    });

    useEffect(() => {
        socket.on('lobby update', (data) => {
            setShowResults(false);
            if (data.success){
                setGameState(data.game_state);
                const status = reactorStatus;
                status.reactor_state = data.reactor_state;
                setReactorStatus(status);
            }
        });
    });

    useEffect(() => {
        socket.on('change state', (data) => {
            setShowResults(false);
            setGameState(data.state);
        });
        
    });

    useEffect(()=> {
        socket.on('end meeting message', (data) => {
            setShowResults(true);
            setResult(data.message);
        })
    });

    useEffect(() => {
        socket.on("reactor update", (data) => {
            console.log(data);
            setReactorStatus(data);
        });
    });

    const socket = useContext(SocketContext);
    return(
        <Container>
            {(gameState=="lobby" || gameState=="game" || gameState == "end") &&
                <div>
                    {type == "Meeting Room" &&
                        <MeetingRoom socket={socket} gameState={gameState}/>
                    }

                    {type == "Reactor" &&
                        <Reactor reactorStatus={reactorStatus} token={token} socket={socket}/>
                    }
                </div>
            }
            {(gameState == "meeting" && tally.meeting_state == "start") &&
                <Container>
                    <Jumbotron>
                        <h1>Emergency Meeting!</h1>
                        <Button size="lg" onClick={() => {
                            // request options
                            const requestOptions = {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({token: token})
                            };

                            // send request to api
                            fetch(sessionStorage.getItem('api-host')+'api/start_meeting', requestOptions);
                        }
                        }>Start Meeting
                        </Button>
                    </Jumbotron>
                </Container>
            }
            {(gameState == "meeting" && tally.meeting_state != "start") &&
                <div>
                    <Timer socket={socket} tally={tally}/>
                    <MeetingTally tally={tally.tally} meetingState={tally.meeting_state} token={token} showResults={showResults} result={result}/>
                </div>
            }

        </Container>
    );
}


export default Console;