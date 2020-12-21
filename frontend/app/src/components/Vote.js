import React, { useEffect, useState, useContext } from "react";
// import io from 'socket.io-client';
import io from 'socket.io-client';
import Container from 'react-bootstrap/Container';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import { useHistory } from "react-router-dom";

import {PlayerVote, Timer} from "../utilities/lobbies.js"
import SocketContext from '../utilities/socket-context'

function Vote() {
    const [tally, setTally] = useState({tally: [], meeting_state: 'discussion'});
    const [profile, setProfile] = useState({is_imposter: false, imposter_list: [], username: ''});
    const [disable, setDisable] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [result, setResult] = useState('');

    const handleClose = () => setShowResults(false);

    const token = sessionStorage.getItem('game-token');
    const history = useHistory();

    // no token then return to homepage
    if (token == null) {
        history.push('/');
    }

    // let socket;
    const socket = useContext(SocketContext);

    useEffect(()=> {
        socket.on('end meeting message', (data) => {
            setShowResults(true);
            setResult(data.message);
        })
    });
    
    useEffect(() => {
        // send a go online signal and request user list
        socket.emit("go online", {token: token, class: 'player', id:-1});


        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({token: token})
        };

        fetch(sessionStorage.getItem('api-host')+'api/player_profile', requestOptions).then(response => response.json()).then((data) => {
            setProfile(data);
            if (!data.success) {
                console.log('pushing lobby');
                history.push('/lobby');
            }

            if (data.game_state != "meeting") {
                console.log('pushing game 1');
                history.push('/game');
            }
        });
    }, []);    

    useEffect(() => {
        // when receiving a lobby list, update playerList state.
        // If not successful, return to home page.
        socket.on("meeting update", (data) => {
            setTally(data);
            if (data.meeting_state != 'vote') {
                setDisable(true);
            } else {
                setDisable(false);
            }
        });
        for (var i in tally.tally) {
            if (tally.tally[i].id == profile.id && tally.tally[i].vote_for != null) {
                setDisable(true);
            }
        }

    });


    useEffect(() => {
        if (socket){
            socket.on('change state', (data) => {
                if (data.state == 'game'){
                    console.log('pushing game 2');
                    history.push('/game');
                }

            });
        }
    });


    return(
        <Container>
            {(tally.meeting_state == "start") &&
                <Jumbotron>
                    <h1>Waiting for meeting to start...</h1>
                </Jumbotron>
            }
            {(tally.meeting_state != "start") &&
    
                <Container>
                    <Timer socket={socket} tally={tally}/>
                    <PlayerVote tally={tally} selfName={profile.username} token={token} disable={disable}/>
                </Container>
            }

            <Modal show={showResults} onClose={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Result
                    </Modal.Title>
                    </Modal.Header>
                        <Modal.Body>
                            {result}
                        </Modal.Body>
                    <Modal.Footer>
                    <Button variant="primary" onClick={handleClose}>
                        Ok
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}


export default Vote;