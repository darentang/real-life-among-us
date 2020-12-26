import React, {useState, useEffect} from "react";
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button'
import ListGroup from 'react-bootstrap/ListGroup'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import ProgressBar from 'react-bootstrap/ProgressBar'

import {useForm} from 'react-hook-form';

import PropTypes from 'prop-types'

function handleDelete(type, token) {
    // request options
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({class: type, token: token})
    };

    // send request to api
    return function(e) {
        console.log('hi');
        fetch(sessionStorage.getItem('api-host')+'api/delete', requestOptions);
    }
}


function BlockModal(props) {
    return (
        <Modal show={props.show} size="lg" centered>
            <Modal.Body>
                <h4>
                Game is starting in {props.remainingTime}.
                </h4>
            </Modal.Body>
        </Modal>
    )
}

function ReactorMeltdown(props) {
    const expiry = props.reactorStatus.reactor_expire;
    const duration = props.reactorStatus.reactor_meltdown_duration;
    const [remain, setRemain] = useState(duration);
    
    useEffect(() => {
        const timeUntil = expiry - Date.now();
        setRemain(Math.max(Math.floor(timeUntil / 1000), 0));
    }, [props.expiry]);

    useEffect(() => {
        let timer;
        if (remain > 0) {
            timer = setInterval(()=> {
                const timeUntil = expiry - Date.now();
                setRemain(Math.max(timeUntil / 1000, 0));
            }, 100);
        } else {
            console.log('expire');
        }

        return () => clearInterval(timer);
    });

    return (
        <Container>
            <h3 style={{"color": "Red"}}>Warning! Reactor meltdown in {Math.floor(remain)} seconds.</h3>
            <ProgressBar now={remain / duration * 100} striped variant="danger"></ProgressBar>
        </Container>
    )
}

function CountdownTimer(props) {
    const [remain, setRemain] = useState(props.expiry - Date.now());

    useEffect(() => {
        const timeUntil = props.expiry - Date.now();
        setRemain(Math.max(Math.floor(timeUntil / 1000), 0));
    }, [props.expiry]);

    useEffect(() => {
        let timer;
        if (remain > 0) {
            timer = setInterval(()=> {
                const timeUntil = props.expiry - Date.now();
                setRemain(Math.max(Math.floor(timeUntil / 1000), 0));
            }, 500);
            props.during();
        } else {
            console.log('expire');
            props.onExpire();
        }

        return () => clearInterval(timer);
    });

    return (
        <Container>
            {remain > 0 && 
                <p>Sabotage Cooldown: {remain} seconds left.</p>
            }
            {/* {remain <= 0 &&
                <p>Time's up.</p>
            } */}
        </Container>
    );
}

function Timer(props) {
    const [remain, setRemain] = useState(0);

    useEffect(() => {
        let timer;
        if (remain >= 0){
            timer = setInterval(()=>{
                var expiry;
                if (props.tally.meeting_state == "discussion") {
                    expiry = props.tally.discussion_end;
                }else if (props.tally.meeting_state == "vote") {
                    expiry = props.tally.voting_end;
                }

                if (expiry != null){
                    // console.log(expiry - Date.now());
                    const timeUntil = expiry - Date.now();  
                    setRemain(Math.max(Math.floor(timeUntil / 1000), 0));
                } else{
                    setRemain(0);
                }

            }, 500);
        }
        return () => clearInterval(timer);
    });

    return (
        <Container>
            <h1>Votes</h1>
            {props.tally.meeting_state == "discussion"&& <h4>Discussion</h4>}
            {props.tally.meeting_state == "vote"&& <h4>Voting</h4>}
            <p>{remain} seconds left</p>
        </Container>
    );
}

function MeetingTally(props) {
    if (props.tally.length == 0) {
        return (<p>Nothing to show.</p>);
    }

    const meetingState = props.meetingState;
    const token = props.token;

    const handleClose = () => {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({token: token, state: 'game'})
        };

        fetch(sessionStorage.getItem('api-host')+'api/change_state', requestOptions);
    };

    return (
        <Container>
            <Table striped bordered >
                <thead>
                    <tr>
                        <th> Name </th>
                        <th> Voted </th>
                        {(meetingState == "reveal" || meetingState == "end") &&
                            <>
                            <th> Voted For </th>
                            <th> Tally </th>
                            </>
                        }
                    </tr>
                </thead>
                <tbody>
                    {
                        props.tally.map((v, i) => {
                            return (
                            <tr key={v.username}>
                                <td>{v.username} </td>
                                <td>{v.vote_for === null ? "No" : "Yes"} </td>
                                {(meetingState == "reveal" || meetingState == "end") &&
                                    <>
                                    <th>{v.vote_for === null ? "-" : v.vote_for}</th>
                                    <th>{v.tally}</th>
                                    </>
                                }
                            </tr>
                            )
                        })
                    }
                </tbody>
            </Table>
            {(meetingState == "reveal" || meetingState == "end")&&
                <Button onClick={() => {
                    const requestOptions = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({token: token})
                    };

                    fetch(sessionStorage.getItem('api-host')+'api/end_meeting', requestOptions);
                }}>
                    Proceed
                </Button>
            }
            <Modal show={props.showResults} onClose={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Result
                    </Modal.Title>
                    </Modal.Header>
                        <Modal.Body>
                            {props.result}
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

function PlayerVote(props) {
    if (props.tally.length == 0) {
        return (<p>Nothing to show.</p>);
    }

    const meetingState = props.tally.meeting_state;
    const tally = props.tally.tally;
    const selfName = props.selfName;
    const token = props.token;
    const disableAll = props.disable;


    return (
        <Table striped bordered >
            <thead>
                <tr>
                    <th> Name </th>
                    <th> Voted </th>
                    <th> Vote </th>
                    {meetingState == "reveal" &&
                        <>
                        <th> Voted For </th>
                        <th> Tally </th>
                        </>
                    }
                </tr>
            </thead>
            <tbody>
                {
                    tally.map((v, i) => {
                        var disabled;
                        if (v.username == selfName || disableAll) {
                            disabled = true;
                        }
                        return (
                        <tr key={v.username}>
                            <td>{v.username} </td>
                            <td>{v.vote_for === null ? "No" : "Yes"} </td>
                            <td> 
                                <Button variant="danger" onClick={()=> {
                                    const requestOptions = {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({token: token, vote_for_id:v.id})
                                    };

                                    fetch(sessionStorage.getItem('api-host')+'api/register_vote', requestOptions);
                                }}
                                disabled={disabled}
                                >
                                    Vote
                                </Button>
                            </td>
                            {meetingState == "reveal" &&
                                <>
                                <th>{v.vote_for === null ? "-" : v.vote_for}</th>
                                <th>{v.tally}</th>
                                </>
                            }
                        </tr>
                        )
                    })
                }
            </tbody>
        </Table>
    );
}

function DisplayRoomList(props) {
    const roomList = props.roomList;
    const editable = props.editable;
    const token = props.token;

    const {register, handleSubmit} = useForm();

    if (editable === null) {
        editable = false;
    }

    return (
        <Table>
            <tbody>
                {
                    roomList.map((v, i) => {
                        return (
                        <tr key={i}>
                            <td>{v}</td>
                            {editable &&
                                <td>
                                    <Button variant="danger" onClick={() => {
                                        const requestOptions = {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({token: token, room_id:i})
                                        };
                
                                        fetch(sessionStorage.getItem('api-host')+'api/delete_room', requestOptions);
                                    }}>
                                        Delete
                                    </Button>
                                </td>
                            }
                        </tr>
                        )
                    })
                }
                {editable &&
                    <tr key={'add'}>
                        <td colSpan="1">
                        <Form onSubmit={handleSubmit((data) => {
                            const requestOptions = {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({token: token, room_name: data.newRoom})
                            };
    
                            fetch(sessionStorage.getItem('api-host')+'api/add_room', requestOptions).then(
                                () => document.getElementById('add-room').reset()
                            );
                        })}
                        id="add-room"
                        >
                                <Form.Control name="newRoom" placeholder="Room Name" ref={register()}>

                                </Form.Control>
                        </Form>
                        </td>
                        <td>
                            <Button type='submit' form="add-room">
                                Add
                            </Button>
                        </td>
                    </tr>
                }
            </tbody>
        </Table>
    );
}

function DisplayPlayerListDebug(props) {
    if (props.list.length == 0) {
        return (<p>No Players</p>);
    }

    function handleLobby(token){
        return (
            function callback(){
                sessionStorage.setItem('game-token', token);
                window.open("lobby", "_blank");

                sessionStorage.setItem('game-token', 'dev');
            }
        )
    }

    function handleGame(token){
        return (
            function callback(){
                sessionStorage.setItem('game-token', token);
                window.open("game", "_blank");

                sessionStorage.setItem('game-token', 'dev');
            }
        )
    }

    return (
        <Table striped bordered >
            <thead>
                <tr>
                    <th> Name </th>
                    <th> Status </th>
                    <th> Connection </th>
                    <th> Imposter </th>
                    <th> Next Task </th>
                    <th> Task Type </th>
                    <th> # Completed </th>
                    <th> Open </th>
                    <th> Delete </th>
                </tr>
            </thead>
            <tbody>
                {
                    props.list.map((v, i) => {
                        return (
                        <tr key={v.name}>
                            <td>{v.name} </td>
                            <td>{v.dead ? "Dead" : "Alive"}</td>
                            <td>
                                <p style={v.online ? {color:'Green'} : {color:'Red'}}>{v.online ? "Online" : "Offline"}</p> 
                            </td>
                            <td>
                                {v.is_imposter ? "Yes" : "No"}
                            </td>
                            <td>{v.next_task}</td>
                            <td>{v.task_type}</td>
                            <td>{v.num_task_completed}</td>
                            <td>
                                <Row>
                                    <Col>
                                        <Button variant="primary" onClick={handleLobby(v.token)}>
                                            Lobby
                                        </Button>
                                    </Col>
                                    <Col>
                                        <Button variant="secondary" onClick={handleGame(v.token)}>
                                            Game
                                        </Button>
                                    </Col>
                                    <Col>
                                        <Button variant="danger" onClick={() => {
                                            const requestOptions = {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({token: v.token})
                                            };
                    
                                            fetch(sessionStorage.getItem('api-host')+'api/kill', requestOptions);
                                        }}>
                                            Kill
                                        </Button>
                                    </Col>
                                </Row>
                            </td>
                            <td><Button variant='danger' onClick={handleDelete('player', v.token)}>Delete</Button></td>
                        </tr>
                        )
                    })
                }
            </tbody>
        </Table>
    );
}

function DisplayPlayerList(props) {
    if (props.list.length == 0) {
        return (<p>No Players</p>);
    }

    return (
        <Table striped bordered >
            <thead>
                <tr>
                    <th> Name </th>
                    <th> Status </th>
                    {props.editable &&
                        <th> Delete </th>
                    }
                </tr>
            </thead>
            <tbody>
                {
                    props.list.map((v, i) => {
                        return (
                        <tr key={v.name}>
                            <td>{v.name} </td>
                            <td>
                                <p style={v.online ? {color:'Green'} : {color:'Red'}}>{v.online ? "Online" : "Offline"}</p> 
                            </td>
                            {props.editable &&
                                <td><Button variant='danger' onClick={handleDelete('player', v.token)}>Delete</Button></td>
                            }
                        </tr>
                        )
                    })
                }
            </tbody>
        </Table>
    );
}


function DisplayConsoleList(props) {
    if (props.list.length == 0) {
        return (<p>No Consoles</p>);
    }
    return (
        <Table striped bordered >
            <thead>
                <tr>
                    <th> Name </th>
                    <th> Type </th>
                    <th> Status </th>
                    {props.debug &&
                        <th> Open </th>
                    }
                    {props.editable &&
                        <th> Delete </th>
                    }
                </tr>
            </thead>
            <tbody>
                {
                    props.list.map((v, i) => {
                        return (
                        <tr key={v.location}>
                            <td>{v.location} </td>
                            <td>{v.type}</td>
                            <td>
                                <p style={v.online ? {color:'Green'} : {color:'Red'}}>{v.online ? "Online" : "Offline"}</p> 
                            </td>
                            {props.debug &&
                                <td><Button onClick={() => {
                                    sessionStorage.setItem('game-token', v.token);
                                    window.open("console", "_blank");
                    
                                    sessionStorage.setItem('game-token', 'dev');
                                }}>Open</Button></td>    
                            }
                            {props.editable &&
                                <td><Button variant='danger' onClick={handleDelete('console', v.token)}>Delete</Button></td>
                            }
                        </tr>
                        )
                    })
                }
            </tbody>
        </Table>
    );
}

function DisplayGameSettings(props) {
    const settings = props.settings;
    if (settings == null) {
        return (<p>No Settings</p>);
    }
    return (
        <ListGroup>
            <ListGroup.Item><b># Imposters: </b>{settings.num_imposters}</ListGroup.Item>
            <ListGroup.Item><b># Task Per Player: </b>{settings.num_task_per_player}</ListGroup.Item>
            <ListGroup.Item><b>Meeting Duration: </b>{settings.meeting_duration}s</ListGroup.Item>
            <ListGroup.Item><b>Voting Duration: </b>{settings.voting_duration}s</ListGroup.Item>
            <ListGroup.Item><b>Secret Code Digits: </b>{settings.secret_code_digits}</ListGroup.Item>
            <ListGroup.Item><b>Confirm Ejection: </b>{settings.confirm_ejection ? "Yes" : "No"}</ListGroup.Item>
            <ListGroup.Item><b>Sabotage Cooldown: </b>{settings.sabotage_cooldown}</ListGroup.Item>
            <ListGroup.Item><b>Reactor Meltdown Duration: </b>{settings.reactor_meltdown_duration}</ListGroup.Item>
        </ListGroup>
    );
}

function DisplayTasks(props) {
    const tasks = props.task;

    if (tasks.length == 0) {
        return (<p>No Tasks</p>);
    }

    return (
        <Table striped bordered >
            <thead>
                <tr>
                    <th> id </th>
                    <th> Room </th>
                    <th> # Assigned </th>
                    <th> Completed </th>
                    <th> Dummy </th>
                    <th> Code </th>
                    <th> Action </th>
                </tr>
            </thead>
            <tbody>
                {
                    tasks.map((v, i) => {
                        return (
                        <tr key={v.id}>
                            <td> {v.id} </td>
                            <td> {v.room} </td>
                            <td> {v.assigned} </td>
                            <td> {v.completed ? "Yes" : "No"} </td>
                            <td> {v.dummy ? "Yes" : "No"} </td>
                            <td> {v.secret_code} </td>
                            <td>
                                <Button disabled={v.completed} onClick={
                                    ()=>{
                                        const requestOptions = {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({task_id: v.id})
                                        };

                                        fetch(sessionStorage.getItem('api-host')+'api/complete_task', requestOptions);
                                    }
                                }>
                                    Complete
                                </Button>
                            </td>
                        </tr>
                        )
                    })
                }
            </tbody>
        </Table>
    );

}

function EditGameSettings(props) {
    const {register, handleSubmit} = useForm();
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState([]);

    const settings = props.settings;

    function handleGameSettings(data) {
        console.log(data);
        // request options
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
    
        fetch(sessionStorage.getItem('api-host')+'api/game_settings', requestOptions).then().then(response => response.json()).then(
            data => {
                console.log('HTTP POST SENT and RECIEVED'); 
                // if successful, save usertoken as cookie
                if (!data.success) {
                    handleOpen();
                    setErrorMessage(data.reason);
                } else {
                    props.onSubmit();
                }
            }
        );

    }

    const handleClose = () => setShowError(false);
    const handleOpen = () => setShowError(true);
    

    if (settings == null) {
        return (<p>No Settings</p>);
    }
    return (
        <Container>
            <Form onSubmit={handleSubmit(handleGameSettings)}>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}># Imposters</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="num_imposters" defaultValue={settings.num_imposters}></Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}># Task Per Player</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="num_task_per_player" defaultValue={settings.num_task_per_player}></Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}>Meeting Duration</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="meeting_duration" defaultValue={settings.meeting_duration}></Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}>Voting Duration</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="voting_duration" defaultValue={settings.voting_duration}></Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}>Secret Code Digits</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="secret_code_digits" defaultValue={settings.secret_code_digits}></Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}>Confirm Ejection</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="confirm_ejection" as="select" defaultValue={settings.confirm_ejection}>
                            <option> true </option>
                            <option> false </option>
                        </Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}>Sabotage Cooldown</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="sabotage_cooldown" defaultValue={settings.sabotage_cooldown}></Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column sm={2}>Reactor Meltdown Duration</Form.Label>
                    <Col sm={10}>
                        <Form.Control ref={register()} name="reactor_meltdown_duration" defaultValue={settings.reactor_meltdown_duration}></Form.Control>
                    </Col>
                </Form.Group>
                <Button variant="primary" type="submit" block>
                    Submit
                </Button>
            </Form>

            <Modal show={showError} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Error   
                    </Modal.Title>
                    </Modal.Header>
                        <Modal.Body>
                            {errorMessage.map((v, i) => {
                                return(<p>{v}</p>);
                            })}
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


DisplayConsoleList.propTypes = {
    editable: PropTypes.bool
}

DisplayConsoleList.defaultProps = {
    editable: false
}

DisplayPlayerList.propTypes = {
    editable: PropTypes.bool
}

DisplayPlayerList.defaultProps = {
    editable: false
}




export {
    DisplayConsoleList, 
    DisplayPlayerList, 
    DisplayPlayerListDebug,
    DisplayGameSettings,
    DisplayTasks,
    DisplayRoomList,
    EditGameSettings,
    BlockModal,
    MeetingTally,
    PlayerVote,
    Timer,
    CountdownTimer,
    ReactorMeltdown
};