import React, { useEffect, useState, useContext } from "react";

// boostrap components
import Container from 'react-bootstrap/Container'
import Jumotron from 'react-bootstrap/Jumbotron'
import Form from 'react-bootstrap/Form'
import FormGroup from 'react-bootstrap/FormGroup'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ToggleButton from 'react-bootstrap/ToggleButton'

import {useForm} from 'react-hook-form';

import { useHistory } from "react-router-dom";


// Login Page
function Login() {
    // state variables
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [inputMode, setInputMode] = useState("1");

    const {register, handleSubmit} = useForm();

    const radios = [
        {name: 'User', value:'1'},
        {name: 'Console', value:'2'}
    ];


    // Open and close handles
    const handleClose = () => setShowError(false);
    const handleOpen = () => setShowError(true);

    const history = useHistory();
    const token = sessionStorage.getItem('game-token');




    // submit username
    const onSubmitUsername = (data) => {
        // request options
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username: data.username})
        };

        // send request to api
        fetch(sessionStorage.getItem('api-host')+'api/add_user', requestOptions).then(response => response.json()).then(
            data => {
                console.log('HTTP POST SENT and RECIEVED'); 
                // if successful, save usertoken as cookie
                if (data.success) {
                    sessionStorage.setItem('game-token', data.token);
                    sessionStorage.setItem('game-type', 'player');
                    // redirect to lobby
                    history.push('/lobby');
                }
                // else, open the modal
                else {
                    handleOpen();
                    setErrorMessage(data.reason);
                }
            }
        );
    };

    const onSubmitConsole = (data) => {
        // request options
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({location: data.location, type: data.type})
        };

        // send request to api
        fetch(sessionStorage.getItem('api-host')+'api/add_console', requestOptions).then(response => response.json()).then(
            data => {
                console.log('HTTP POST SENT and RECIEVED'); 
                // if successful, save usertoken as cookie
                if (data.success) {
                    sessionStorage.setItem('game-token', data.token);
                    sessionStorage.setItem('game-type', 'console');
                    // redirect to lobby
                    history.push('/console');
                }
                // else, open the modal
                else {
                    handleOpen();
                    setErrorMessage(data.reason);
                }
            }
        );
    };

    useEffect(()=>{
        if (token != null) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({token: token})
            };
    
            fetch(sessionStorage.getItem('api-host')+'api/player_profile', requestOptions).then(response => response.json()).then((data) => {
                if (data.success) {
                    if (data.type == 'player') {
                        history.push('/lobby');
                    } else if  (data.type == 'console'){
                        history.push('/console');
                    }
                }
            });
        }
    }, [])

    useEffect(()=>{console.log('Input mode ' + inputMode);}, [inputMode]);


    const playerForm = (
        <Form onSubmit={handleSubmit(onSubmitUsername)}>
            <FormGroup controlId="username-input">
                <Form.Label>Username</Form.Label>
                <Form.Control type="text" placeholder="Enter username" name="username" ref={register()}>
                </Form.Control>
            </FormGroup>
            <Button variant="primary" type="submit" block>
                Submit
            </Button>
        </Form>
    );

    const consoleForm = (
        <Form onSubmit={handleSubmit(onSubmitConsole)}>
            <FormGroup controlId="consol-loc">
                <Form.Label>Console Location</Form.Label>
                <Form.Control type="text" placeholder="Console Location" name="location" ref={register()}>
                </Form.Control>
            </FormGroup>
            <FormGroup>
                <Form.Label>Type</Form.Label>
                <Form.Control as="select" name="type" ref={register()}>
                    <option>Meeting Room</option>
                    <option>Reactor</option>
                </Form.Control>
            </FormGroup>
            <Button variant="primary" type="submit" block>
                Submit
            </Button>
        </Form>
    )

    function InputForm(props) {
        if (props.mode == '1') {
            return playerForm;
        } else if (props.mode == '2') {
            return consoleForm;
        }
    }


    return (
        <Container>
        <Jumotron className="Login-jumbo">
            <h1 className="App-header">Real-Life Among Us</h1>
            <ButtonGroup toggle>
                {
                    radios.map((radio, idx) => (
                        <ToggleButton
                            key={idx}
                            variant="secondary"
                            type="radio"
                            value={radio.value}
                            checked={inputMode === radio.value}
                            onChange={(e) => setInputMode(e.currentTarget.value)}
                        >
                            {radio.name}
                        </ToggleButton>
                    ))
                }
            </ButtonGroup>
            <InputForm mode={inputMode}/>

        </Jumotron>

            {/* username taken error */}
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
    );
}

export default Login;