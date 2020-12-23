import React, {useState, useEffect} from 'react';
import Container from 'react-bootstrap/esm/Container';

import Jumbotron from 'react-bootstrap/Jumbotron';
import Button from 'react-bootstrap/Button';

import { useHistory } from "react-router-dom";

function EndGame() {
    const [info, setInfo] = useState({who: '', imposters: [], success: false})
    const [success, setSuccess] = useState(false);
    const history = useHistory();
    useEffect(() => {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        };

        fetch(sessionStorage.getItem('api-host')+'api/who_won', requestOptions).then(response => response.json()).then((data)=>{
            console.log(data);
            if (data.success) {
                setSuccess(true);
                setInfo(data);
            } else {
                history.push('/');
            }
        })
    }, []);
    return (
        <Container>
            <Jumbotron>
                {success &&
                    <div>
                        <h1>This is the End!</h1>
        
                        <p>The {info.who} won. </p>
                        <p>The imposters are {info.imposters.join(',')}</p>
                        <Button onClick={()=>history.push('/')}>
                            Return
                        </Button>
                    </div>
                }
                {!success &&
                    <h1>Oops the game has not ended.</h1>
                }
            </Jumbotron>
        </Container>
    );
}

export default EndGame;