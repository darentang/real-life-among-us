import React, { useEffect, useState, useContext } from "react";
// import io from 'socket.io-client';
import io from 'socket.io-client';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

import SocketContext from '../utilities/socket-context'

import {
    DisplayConsoleList, 
    DisplayPlayerListDebug, 
    DisplayGameSettings,
    EditGameSettings,
    BlockModal,
    DisplayTasks
} from "../utilities/lobbies.js"


function Dev() {
    // player list state
    const [playerList, setPlayerList] = useState([]);
    const [consoleList, setConsoleList] = useState([]);
    const [taskList, setTaskList] = useState([]);
    const [gameSettings, setGameSettings] = useState(null);
    const [gameState, setGameState] = useState("");

    
    // const token = fromCookie('game-token');
    const token = 'dev';

    const socket = useContext(SocketContext);
    
    useEffect(() => {
        socket.emit("go online", {token: token});
    }, []);

    useEffect(() => {
        socket.on("lobby update dev", (data) => {
            // update list
            console.log(data);
            setPlayerList(data.users);
            setConsoleList(data.consoles);
            setGameSettings(data.game_settings);
            setGameState(data.game_state);
            setTaskList(data.tasks);
        });
    });
    
    

    return(
        <Container>
            <h1>Dev</h1>
            <h4>Debug Tools</h4>
            <Row>
                <Col>
                    <Button onClick={() => {
                        let socket = io("http://192.168.0.30:5000");
                        socket.on('connect', function() {
                            socket.emit('test', {data: 'Im connected!'});
                        });
                    }}>
                        API Test
                    </Button>
                </Col>
                <Col>
                    <Button onClick={() => {
                        // request options
                        const requestOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({token: token, duration: 0})
                        };

                        // send request to api
                        fetch(sessionStorage.getItem('api-host')+'api/start_game', requestOptions);
                    }}>
                        Start Game
                    </Button>
                </Col>
                <Col>
                    <Button onClick={() => {
                        // request options
                        const requestOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({token: token, state: 'game'})
                        };

                        // send request to api
                        fetch(sessionStorage.getItem('api-host')+'api/change_state', requestOptions);
                    }}>
                        Set Game
                    </Button>
                </Col>
                <Col>
                    <Button onClick={() => {
                        // request options
                        const requestOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({token: token, state: 'lobby'})
                        };

                        // send request to api
                        fetch(sessionStorage.getItem('api-host')+'api/change_state', requestOptions);
                    }}>
                        Set Lobby
                    </Button>
                </Col>
                <Col>
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
                </Col>
                <Col>
                    <Button onClick={() => {
                        const requestOptions = {
                            method: 'GET'
                        };

                        fetch(sessionStorage.getItem('api-host')+'api/populate', requestOptions);
                    }}>
                        Populate
                    </Button>
                </Col>
                <Col>
                    Game State: {gameState}
                </Col>
            </Row>
            <Row>
                <Col>
                    <h4>Players</h4>
                    <DisplayPlayerListDebug list={playerList} editable={true} className="Lobby-table"/>
                </Col>
            </Row>
            <Row>
                <Col>
                    <h4>Consoles</h4>
                    <DisplayConsoleList list={consoleList} editable={true} debug={true} className="Lobby-table"/>
                </Col>
            </Row>
            <Row>
                <Col>
                    <h4>Tasks</h4>
                    <DisplayTasks task={taskList}/>
                </Col>
            </Row>
            <Row>
                <Col>
                    <h4>Game Settings</h4>
                    <DisplayGameSettings settings={gameSettings}/>
                </Col>
            </Row>
        </Container>

    );
}


export default Dev;