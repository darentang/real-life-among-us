import React, { useEffect, useState, useContext } from "react";



// boostrap components
import Container from 'react-bootstrap/Container'
import Jumbotron from 'react-bootstrap/Jumbotron'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

import {useForm} from 'react-hook-form';



function Connect(props) {

    const {register, handleSubmit} = useForm();
    const [modalState, setModalState] = useState({show: false, message: ''});
    const handleHide = () => {
        setModalState({show: false, message: modalState.message});
    }

    function checkConnect(data) {
        if (data.address == '') {
            return;
        }
        // let address;
        // if (data.port == ''){
        //     address = data.protocol + data.address + '/';
        // } else {
        //     address = data.protocol + data.address + `:${data.port}/`;
        // }
        var address = data.address;
        const requestOptions = {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }
        };
        if (address[address.length - 1] !== "/") {
            address += "/";
        }
        console.log(address);
        setModalState({show: true, message: 'Trying to connect...'});
        fetch(address + 'api/check_connection', requestOptions).then(response => response.json()).then(data => {
            if (data.success) {
                setModalState({
                    show:true, message: 'Connected to ' + address
                });
                sessionStorage.setItem('api-host', address);
                props.setAddress(address);
            }
        }).catch(
            error => {
                setModalState({
                    show: true, message: 'The following occurred while attempting to connect:\n' + error
                })
            }
        );   
    };

    return (
        <Container>
            <Jumbotron>
                <h1>Connect</h1>
                <p>Connect to a local or global game. Note that you may need to manually allow the SSL certificate of local servers with self signed certificates.</p>
                <h4 style={{marginTop: '2vh'}}>Local</h4>
                <Form onSubmit={handleSubmit(checkConnect)}>
                    <Form.Group>
                        <Form.Label>Local Server Address</Form.Label>
                        <InputGroup>
                            <Form.Control name="address" ref={register()} ></Form.Control>
                        </InputGroup>
                    </Form.Group>
                    <Button type="submit">Connect</Button>
                </Form>
                <h4 style={{marginTop: '2vh'}}>Global</h4>
                <Button onClick={() => checkConnect({address:'https://impostertang-api.herokuapp.com/'})}>
                    Connect to Global Server
                </Button>
            </Jumbotron>
            <Modal show={modalState.show} onHide={handleHide} closeButton>
                <Modal.Header>Information</Modal.Header>
                <Modal.Body>{modalState.message}</Modal.Body>
            </Modal>
        </Container>
    );
}

export default Connect;