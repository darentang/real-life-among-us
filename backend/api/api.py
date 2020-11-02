import flask
from flask import request, jsonify
from flask_socketio import SocketIO, send, emit
import secrets
import json
import time

app = flask.Flask(__name__)
app.config["DEBUG"] = True
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*')

players = {}

def check_duplicate(name):
    for player in players.values():
        if str(player['name']) == str(name):
            return True
    return False

@socketio.on('check_player')
def check_player(data):
    data = dict(data)
    player = data['name']
    if not check_duplicate(player):
        emit('check_player_callback', {'data': 1})
    else:
        emit('check_player_callback', {'data': 0})


@socketio.on('add_player')
def add_player(data):
    data = dict(data)
    player = data['name']
    if not check_duplicate(player):
        token = secrets.token_urlsafe(10)
        players[token] = {'name': str(player), 'time': str(time.time()), 'token': token}
        print(players)
        emit('player_token_callback', players[token])
        emit('player_list_update', players, broadcast=True)
    else:
        print('error')
        return '0'

@socketio.on('fetch_player')
def add_player(data):
    data = dict(data)
    token = data['token']
    result = players.get(token)
    emit('fetch_player', result)

@socketio.on('request_player_list')
def request_player_list():
    emit('player_list_update', players)

@app.route('/api/delete_player', methods=['GET'])
def delete_player():
    token = request.args['token']
    if token in players.keys():
        del players[token]
        return '1'
    else:
        return '0'

@socketio.on('message')
def handle_message(message):
    print(message)

@socketio.on('json')
def handle_json(json):
    print('received json: ' + str(json))

@socketio.on('ping')
def pongResponse():
    emit('pong')


@socketio.on('my event')
def event_message(message):
    print(message)

@app.route('/api/test')
def test_api():
    return """
<script src="//cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.js" integrity="sha256-yr4fRk/GU1ehYJPAs8P4JlTgu0Hdsp4ZKrx8bDEDC3I=" crossorigin="anonymous"></script>
<script type="text/javascript" charset="utf-8">
    var socket = io();
    socket.on('connect', function() {
        socket.emit('my event', {data: 'Im connected!'});
    });
</script>
    """

if __name__ == '__main__':
    socketio.run(app, host='192.168.0.28', port=5000)