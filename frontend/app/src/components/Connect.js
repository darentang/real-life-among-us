import React, { useEffect, useState, useContext } from "react";



// boostrap components
import Container from 'react-bootstrap/Container'
import Jumbotron from 'react-bootstrap/Jumbotron'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

import {useForm} from 'react-hook-form';

import { useHistory } from "react-router-dom";




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
        const address = 'https://' + data.address + ':5000/';
        const requestOptions = {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }
        };
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

                <Form onSubmit={handleSubmit(checkConnect)}>
                    <Form.Group>
                        <Form.Label>Server IP Address</Form.Label>
                        <Form.Control name="address" ref={register()} ></Form.Control>
                    </Form.Group>
                    <Button type="submit">Connect</Button>
                </Form>
            </Jumbotron>
            <Modal show={modalState.show} onHide={handleHide} closeButton>
                <Modal.Header>Information</Modal.Header>
                <Modal.Body>{modalState.message}</Modal.Body>
            </Modal>
        </Container>
    );
}

export default Connect;