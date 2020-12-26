import React, {useEffect, useState, useContext} from 'react';
import { useHistory } from "react-router-dom";
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Card from 'react-bootstrap/Card';
import CardDeck from 'react-bootstrap/CardDeck';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Toast from 'react-bootstrap/Toast';
import {useForm} from 'react-hook-form';
import ProgressBar from 'react-bootstrap/ProgressBar';

import SocketContext from '../utilities/socket-context'

import {ArrowRepeat} from 'react-bootstrap-icons'

import {CountdownTimer, ReactorMeltdown} from '../utilities/lobbies'

function Home(props) {

    const profile = props.profile;
    const token = props.token;
    const history = props.history;

    const [showProfile, setShowProfile] = useState(false);
    const [showDead, setShowDead] = useState(false);
    const handleCloseProfile = () => setShowProfile(false);
    const handleCloseDead = () => setShowDead(false);



    return (
        <Container>
            
            <Row>
                <Col>
                    <CardDeck>
                        <Card>
                            <Card.Header as="h5">Your Role</Card.Header>
                            <Card.Body>
                                <Card.Text>Click the button below to find out if you're a crewmate or an imposter.</Card.Text>
                            </Card.Body>
                            <Card.Footer>
                                <Button onClick={() => {setShowProfile(true);}}>Who am I?
                                </Button>
                            </Card.Footer>
                        </Card>

                        <Card>
                            <Card.Header as="h5">If You're Killed...</Card.Header>
                            <Card.Body>
                                <Card.Text>Click the button below to let the game know that you're dead.</Card.Text>
                            </Card.Body>
                            <Card.Footer>
                                <Button variant="danger" onClick={() => setShowDead(true)}>
                                    I am dead!
                                </Button>
                            </Card.Footer>
                        </Card>

                        <Card>
                            <Card.Header as="h5">Report Body</Card.Header>
                            <Card.Body>
                                <Card.Text>See a dead body? Click the button below to report it.</Card.Text>
                            </Card.Body>
                            <Card.Footer>
                                <Button variant="primary" onClick={() => {
                                    const requestOptions = {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({token: token, meeting_type: "report"})
                                    };

                                    // send request to api
                                    fetch(sessionStorage.getItem('api-host')+'api/trigger_meeting', requestOptions);
                                }}>
                                    Report!
                                </Button>
                            </Card.Footer>
                        </Card>

                    </CardDeck>
                </Col>
            </Row>


            <Modal show={showProfile}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Who am I?   
                    </Modal.Title>
                </Modal.Header>
                    <Modal.Body>
                    <p>Your name is {profile.username}</p>
                    <p>You are {profile.is_imposter ? "an Imposter" : "a Crewmate"}. </p>
                    {profile.is_imposter && 
                    <div>Imposters are: {profile.imposter_list.join(', ')}</div>
                    }
                    </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleCloseProfile}>
                        Ok
                    </Button>
                </Modal.Footer>
            </Modal>


            <Modal show={showDead}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Are you sure?
                    </Modal.Title>
                </Modal.Header>
                    <Modal.Body>
                    <p>
                        Are you sure that you are dead?
                    </p>
                    </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDead}>
                        No
                    </Button>
                    <Button variant="danger" onClick={() => {
                        const requestOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({token: token})
                        };

                        fetch(sessionStorage.getItem('api-host')+'api/kill', requestOptions).then(response => response.json()).then((data)=>{
                            if (data.success) {
                                history.push('/lobby');
                            }
                        })
                    }}>
                        Yes
                    </Button>
                </Modal.Footer>
            </Modal>
            
        </Container>
    );
}

function Task(props) {
    const task = props.task;
    const token = props.token;
    const profile = props.profile;

    const {register, handleSubmit} = useForm();

    const [errorMessage, setErrorMessage] = useState('');
    const [showError, setShowError] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [showInput, setShowInput] = useState(false);


    const handleClose = () => {
        setShowError(false);
    }

    const onSubmitCode = (data) => {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({token: token, secret_code: data.code})
        };

        fetch(sessionStorage.getItem('api-host')+'api/validate_code', requestOptions).then(response => response.json()).then((data) => {
            if (!data.success) {
                setShowError(true);
                setErrorMessage(data.reason);
            }
        });
    };

    return (
        <Container>
            <Jumbotron> 
                {task != null &&
                <div>
                    <h2>Your next task...</h2>
                    <h4>
                        Go to {task.room}.
                    </h4>
                    {task.task_type == "sender" &&
                        <div>
                            <p>You are the sender. Click the button below to see the secret code.</p>
                                <Button onClick={() => setShowSecret(true)}>
                                    Show
                                </Button>
                            <p>
                                Share this with the other person in the room.
                            </p>
                            <Modal show={showSecret} onHide={() => setShowSecret(false)} size="lg" centered>
                                <Modal.Header closeButton> </Modal.Header>
                                <Modal.Body closeButton>
                                    <h2 style={{'margin': '30vh 10vh 30vh 10vh', 'text-align': 'center'}}>
                                        {task.secret_code}
                                    </h2>
                                </Modal.Body>
                                
                            </Modal>
                        </div>   
                    }
                    {(task.task_type == "receiver" || profile.is_imposter)&&
                        <div>
                            <p>
                                You are the receiver. Ask the other person in the room for the secret code.
                            </p>
                            <p>
                                <Button onClick={() => setShowInput(true)}>
                                    Enter Code
                                </Button>
                            </p>
                            <Modal show={showInput} onHide={() => setShowInput(false)} size="lg" centered>
                                <Modal.Header closeButton> </Modal.Header>
                                <Modal.Body>
                                    <Form onSubmit={handleSubmit(onSubmitCode)} style={{'margin': '30vh 10vh 30vh 10vh', 'text-align': 'center'}}>
                                        <Form.Group>
                                            <Form.Label>Secret Code:</Form.Label>
                                            <Form.Control type="text" name="code" ref={register()}>
                                            </Form.Control>
                                        </Form.Group>
                                        <Button variant="primary" type="submit" onClick={()=> setShowInput(false)}>
                                            Submit
                                        </Button>
                                    </Form>
                                </Modal.Body>
                            </Modal>
                        </div>
                    }
                </div>
                }
                {task == null && 
                <div>
                    <h1>No task received yet.</h1>
                </div>
                }
            </Jumbotron>
            <Modal show={showError} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Error   
                    </Modal.Title>
                    </Modal.Header>
                        <Modal.Body>
                            {errorMessage}
                        </Modal.Body>
                    <Modal.Footer>
                    <Button variant="primary" onClick={handleClose}>
                        Ok
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
        
    )
}

function SecretMenu(props) {
    const task = props.task;
    const profile = props.profile;
    const [disable, setDisable] = useState(true);
    useEffect(() => {
        console.log('ran');
    });

    return (
        <div>
            {profile.is_imposter && 
            <div>
            <h3>Sabotage Menu</h3>
            <p>Shhhhhh... Don't show anyone else this page.</p>
            {props.task != null &&
                <CountdownTimer expiry={task.sabotage_expire} onExpire={()=>setDisable(false)} during={()=>setDisable(true)} />
            }
            <CardDeck>
                <Card>
                    <Card.Header as="h5">Dummify</Card.Header>
                    <Card.Body>
                        <Card.Text>Turn 50% of current tasks to dummy tasks.</Card.Text>
                    </Card.Body>
                    <Card.Footer>
                        <Button onClick={() => {
                            const requestOptions = {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({token: props.token, type: 'dummify'})
                            };
                    
                            fetch(sessionStorage.getItem('api-host')+'api/sabotage', requestOptions)
                        }} disabled={disable}>
                            Dummify
                        </Button>
                    </Card.Footer>
                </Card>

                <Card>
                    <Card.Header as="h5">Core Meltdown</Card.Header>
                    <Card.Body>
                        <Card.Text>Make the crewmatese type in a passage in the reactor console in order to save the reactor.</Card.Text>
                    </Card.Body>
                    <Card.Footer>
                        <Button onClick={()=>{
                            const requestOptions = {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({token: props.token, type: 'meltdown'})
                            };
                    
                            fetch(sessionStorage.getItem('api-host')+'api/sabotage', requestOptions)
                        }}disabled={disable}>
                            Sabotage
                        </Button>
                    </Card.Footer>
                </Card>

            </CardDeck>
            </div>
            }
            {!profile.is_imposter && 
                <p>You are a crewmate. There are no secrets for you :(</p>
            }
        </div>
    );
}

function Game() {

    const [profile, setProfile] = useState({is_imposter: false, imposter_list: [], username: ''});
    const [task, setTask] = useState(null);
    const socket = useContext(SocketContext);
    const [progress, setProgress] = useState({completed:0, total:1});
    const [reactorStatus, setReactorStatus] = useState({'reactor_state': 'normal'});

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    const token = sessionStorage.getItem('game-token');
    const history = useHistory();

    if (token == null) {
        history.push('/');
    }


    useEffect(() => {
        // send a go online signal and request user list
        socket.emit("go online", {token: token, class: 'player'});


        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({token: token})
        };

        fetch(sessionStorage.getItem('api-host')+'api/player_profile', requestOptions).then(response => response.json()).then((data) => {
            setProfile(data);
            if (!data.success) {
                history.push('/lobby');
            }
            if (data.dead) {
                history.push('/lobby');
            }
            if (data.is_imposter){
                console.log('I am an imposter');
                console.log(data.imposter_list);
            } else {
                console.log(data);
                console.log('Not Imposter');
            }
        });
    }, []);    

    useEffect(() => {
        socket.on("lobby update", (data) => {
            if (data.game_state == 'meeting') {
                history.push('/vote');
            }else if (data.game_state == 'end'){
                history.push('/end');
            }else if (data.game_state == 'lobby') {
                history.push('/lobby');
            }
        });
    });


    useEffect(() => {
        socket.on("task update", (data) => {
            // console.log(data);
            setTask(data);
        });
    });

    useEffect(() => {
        socket.on("change state", (data) => {
            if (data.state == 'lobby'){
                history.push('/lobby');
            }else if (data.state == 'meeting') {
                history.push('/vote');
            }else if (data.state == 'end') {
                history.push('/end')
            }
        });
    });

    useEffect(() => {
        socket.on("task complete", (data) => {
            setShowToast(true);
            if (data.dummy){
                setToastMessage('Oops. That was a dummy task. Guess I just wasted your time. Proceed to your next task 🥴🥴');
            }else{
                setToastMessage('Well Done! You have completed a task.');
            }
        });
    });

    useEffect(() => {
        socket.on("reactor update", (data) => {
            // console.log(data);
            setReactorStatus(data);
        });
    });

    useEffect(() => {
        socket.on("lobby update", (data) => {
            setProgress(data.task_status);
        });
    });

    return (
        <Container style={{'topMargin': '5vh'}}>
            <div style={{position: 'relative', 'zIndex': 2070, opacity:0.8}}>
                <Toast show={showToast} onClose={()=>{setShowToast(false)}} style={{position: 'absolute', top: '0', right: '0'}}>
                    <Toast.Header>Notification</Toast.Header>

                    <Toast.Body>{toastMessage}</Toast.Body>
                </Toast>
            </div>

            <Row>
                <Col>
                    <div>
                        <h4>Task Progress</h4>
                        <p>{progress.completed} out of {progress.total} completed.</p>
                        
                    </div>
                </Col>
                <Col>
                    <Button style={{float: 'right'}} onClick={() => socket.emit("go online", {token: token, class: 'player'})}>
                        <ArrowRepeat size={30}/>
                    </Button>
                </Col>
            </Row>
            <Row style={{margin: '2vh'}}>
                <Col>
                    <ProgressBar striped variant="success" now={Math.round(progress.completed/progress.total*100)}/>
                </Col>
            </Row>
            {reactorStatus.reactor_state != "normal" &&
            <Row style={{margin: '2vh'}}>
                <Col>
                    <ReactorMeltdown reactorStatus={reactorStatus}/>
                </Col>
            </Row>
            }


            <Tabs defaultActiveKey="home">
                    <Tab eventKey="home" title="Home">
                        <div className='tabContent'>
                        <Home profile={profile} token={token} history={history} progress={progress}/>
                        </div>
                    </Tab>
                    <Tab eventKey="tasks" title="Tasks">
                        <div className='tabContent'>
                        <Task task={task} token={token} profile={profile}/>
                        </div>
                    </Tab>
                    <Tab eventKey="screte" title="Secret Menu">
                        <div className='tabContent'>
                        <SecretMenu profile={profile} token={token} history={history} task={task}/>
                        </div>
                    </Tab>
            </Tabs>
        </Container>
    );
}

export default Game;