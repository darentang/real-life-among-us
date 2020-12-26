import React, { useEffect, useState, useContext } from "react";
// import io from 'socket.io-client';

import Form from 'react-bootstrap/Form';
import {useForm} from 'react-hook-form';

import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Button from 'react-bootstrap/Button';
import ProgressBar from 'react-bootstrap/ProgressBar';

import { useHistory } from "react-router-dom";
import SocketContext from '../utilities/socket-context'



import {
    DisplayConsoleList, 
    DisplayPlayerList, 
    DisplayGameSettings,
    DisplayRoomList,
    EditGameSettings,
    BlockModal,
    MeetingTally,
    Timer,
    ReactorMeltdown
} from "../utilities/lobbies.js"
import Modal from "react-bootstrap/esm/Modal";


function MeetingRoom(props) {
    const duration = 5;
    // player list state
    const [playerList, setPlayerList] = useState([]);
    const [consoleList, setConsoleList] = useState([]);
    const [roomList, setRoomList] = useState([]);
    
    const [progress, setProgress] = useState({completed:0, total:1});
    const [showModal, setShowModal] = useState(false);
    const [countDown, setCountDown] = useState({time: null, countdown: null});
    
    const [gameSettings, setGameSettings] = useState(null);
    const [remain ,setRemain] = useState(duration);

    const [showSettingsModal, setShowSettingsModal] = useState({settings: false, room: false});


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
                setRoomList(data.room_list);
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
                    <div style={{position: 'relative'}}>
                        <Button style={{position: 'absolute', right: 0, bottom:0}} onClick={() => {
                            
                            const requestOptions = {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({token: token})
                            };

                            // send request to api
                            fetch(sessionStorage.getItem('api-host')+'api/reset', requestOptions);
                        }}>
                            Reset
                        </Button>
                    </div>
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
            {gameState != 'lobby' && 
                <Row>
                    <Col>
                        <div style={{'margin-top': '1vh', 'margin-bottom': '2vh'}}>
                            <h4>Task Progress</h4>
                            <p>{progress.completed} out of {progress.total} completed.</p>
                            <ProgressBar striped variant="success" now={Math.round(progress.completed/progress.total*100)}/>
                        </div>
                    </Col>
                </Row>
            }
            {gameState == 'lobby' &&
                <div>
                    <h4>Change Game Settings</h4>
                    <Button onClick={() => setShowSettingsModal({settings: true, room: false})} style={{margin: '2vh'}}>
                        Edit Settings
                    </Button>
                    <Button onClick={() => setShowSettingsModal({settings: false, room: true})} style={{margin: '2vh'}}>
                        Edit Room List
                    </Button>
                </div>
            }
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
                <Col>
                    <h4>Room List</h4>
                    <DisplayRoomList roomList={roomList}/>
                </Col>
            </Row>
            <BlockModal show={showModal} remainingTime={remain} countDown={countDown}/>
            <Modal show={showSettingsModal.settings} onHide={() => setShowSettingsModal({settings: false, room: false})}>
                <Modal.Header closeButton>
                    Edit Game Settings
                </Modal.Header>
                <Modal.Body>
                    <EditGameSettings settings={gameSettings} onSubmit={() => setShowSettingsModal({settings: false, room: false})}/>
                </Modal.Body>
            </Modal>

            <Modal show={showSettingsModal.room} onHide={() => setShowSettingsModal({settings: false, room: false})}>
                <Modal.Header closeButton>
                    Edit Room List
                </Modal.Header>
                <Modal.Body>
                    <DisplayRoomList roomList={roomList} editable={true} token={token}/>
                </Modal.Body>
            </Modal>
        </Container>

    );
}

function Reactor(props) {

    const token = props.token;
    
    const text = props.text;

    const {register, handleSubmit} = useForm();
    const [showModal, setShowModal] = useState(false);
    const [inputText, setInputText] = useState('');
    
    useEffect(() => {
        props.socket.on("lobby update", (data) => {
            if (data.game_state == 'end') {
                props.history.push('/end');
            }
        });

        props.socket.on("reactor update", (data) => {
            if (data.reactor_state == 'trigger') {
                setInputText('');
            }
        })
    });

    const Diff = require('diff');

    const onSubmit = (data) => {
        if (text == data.text) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({token: token})
            };

            // send request to api
            fetch(sessionStorage.getItem('api-host')+'api/save_core', requestOptions);
        } else {
            setShowModal(true);
            console.log(data.text);
        }
    };

    const handleFormChange = (e) => {
        setInputText(e.target.value);
    }

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
                        <Card.Header style={{'font-size': 'large'}}>Type the following passage:</Card.Header>
                        <Card.Body>
                            <p style={{fontSize: 'xx-large'}}>{Diff.diffChars(text, inputText).map((v, i) => {
                                const color = v.added ? 'red':
                                    v.removed ? 'white' : 'green';
                                return (
                                    <span style={{color: color}}>
                                        {v.value}
                                    </span>
                                )
                            })}</p>
                            <Form onSubmit={handleSubmit(onSubmit)}>
                                <Form.Control name="text"  ref={register()} onChange={handleFormChange}></Form.Control>
                                <Button type="submit">Save Core</Button>
                            </Form>
                        </Card.Body>
                    </Card>
                    </Col>
                </Row>
                <Modal show={showModal} onHide={() => setShowModal(false)}>
                    <Modal.Header closeButton>Wrong!</Modal.Header>
                    <Modal.Body>What you typed it did not match the message :(</Modal.Body>
                </Modal>
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
    const [text, setText] = useState('');

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
                if (data.console_type != "Meeting Room" && data.game_state == "end") {
                    history.push('/end');
                }
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
            setReactorStatus(data);
            if (data.passage != text) {
                setText(data.passage);
            }
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
                        <Reactor reactorStatus={reactorStatus} token={token} socket={socket} text={text} history={history}/>
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