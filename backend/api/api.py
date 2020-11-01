import flask
from flask import request, jsonify
from flask_socketio import SocketIO, send, emit
import secrets
import json
import time

app = flask.Flask(__name__)
app.config["DEBUG"] = True
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

players = {}

@socketio.on('add_player')
def add_player(data):
    data = dict(data)
    player = data['name']
    if player not in players:
        token = secrets.token_urlsafe(10)
        players[token] = {'name': str(player), 'time': str(time.time())}
        send(players, json=True, namespace='/test')
        return token
    else:
        return '0'

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

if __name__ == '__main__':
    socketio.run(app)