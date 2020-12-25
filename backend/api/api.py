
import eventlet
eventlet.monkey_patch()

import time
import atexit
from collections import Counter

import flask
from flask import request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from uuid import uuid4
from flask_socketio import SocketIO, send, emit
import secrets
import json
import datetime

import random

from scipy.stats import binom, norm, uniform

from apscheduler.schedulers.background import BackgroundScheduler


# flask configurations
app = flask.Flask(__name__)
app.config["DEBUG"] = True
app.config['SECRET_KEY'] = 'secret!'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/user.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PRESERVE_CONTEXT_ON_EXCEPTION'] = False
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='eventlet')
CORS(app)

cron = BackgroundScheduler()
cron.start()

atexit.register(lambda: cron.shutdown(wait=False))

# db models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(150))
    username = db.Column(db.String(80), unique=True)
    join_time = db.Column(db.DateTime())
    is_imposter = db.Column(db.Boolean())
    sid = db.Column(db.String(80))
    online = db.Column(db.Boolean(), default=False)
    dead = db.Column(db.Boolean(), default=False)
    next_task = db.Column(db.Integer)
    task_type = db.Column(db.String(10))
    num_task_completed = db.Column(db.Integer, default=0)
    universal_key = db.Column(db.String(20))

    def __repr__(self):
        return f'<User {self.username}>'

class Console(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(150))
    join_time = db.Column(db.DateTime())
    location = db.Column(db.String(80), unique=True)
    console_type = db.Column(db.String(80), unique=True)
    sid = db.Column(db.String(80))
    online = db.Column(db.Boolean(), default=False)

    def __repr__(self):
        return f'<Console at {self.location}>'

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room = db.Column(db.String(20))
    dummy = db.Column(db.Boolean(), default=False)
    completed = db.Column(db.Boolean(), default=False)
    assigned = db.Column(db.Integer, default=0)
    secret_code = db.Column(db.String(20))

    def __repr__(self):
        return f'<Task #{self.id} at {self.room}>'

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(150))
    username = db.Column(db.String(80), unique=True)
    vote_for = db.Column(db.String(150))
    called_meeting = db.Column(db.Boolean(), default=False)


# recreate db everytime
# db.drop_all()
db.create_all()


game_settings = {
    'num_imposters': 2,
    'meeting_duration': 10,
    'voting_duration': 5,
    'kill_cooldown': 20,
    'num_task_per_player': 2,
    'confirm_ejection': True,
    'num_collaborate': 2,
    'max_concurrent_tasks': 1,
    'prob_dummy': 0.1,
    'dummy_cooldown_min': 30,
    'dummy_cooldown_max': 60,
    'sabotage_cooldown': 10,
    'reactor_meltdown_duration': 60
}

imposter_list = [e for e in User.query.all() if e.is_imposter]
game_state = 'lobby'
meeting_state = 'discussion'
reactor_state = 'normal'
discussion_end = datetime.datetime.now()
voting_end = datetime.datetime.now()
sabotage_expire = datetime.datetime.now()
reactor_expire = datetime.datetime.now()
reactor_passage = ""
dev_sid = ""
winner = None

room_list = ["Room"+str(i) for i in range(1, 14)]

room_list = [
    "Master Bathroom",
    "Master Closet",
    "Upstair Study",
    "Daren's room",
    "Upstair bathroom",
    "Susum's Room",
    "Downstairs Study",
    "Living Room",
    "Game Room",
    "Dining Room",
    "Kitchen",
    "Laundry",
    "Front Door"
]

@app.route('/api/populate', methods=['GET'])
def populate(num_players=5, num_consoles=1):
    class Empty:
        pass

    request = Empty()
    for i in range(num_players):
        request.json = {
            "username": f"Player {i+1}"
        }
        _add_user(request)

    request.json = {
        "location": "Main",
        "type": "Meeting Room"
    }
    _add_console(request)

    for i in range(num_consoles - 1):
        request.json = {
            "location": f"Room {i+1}",
            "type": "Reactor"
        }
        _add_console(request)

    return {'success': True}

@app.route('/api/reset', methods=['POST'])
def reset():
    token = request.json.get('token')
    if token == 'dev' or game_state == "end":
        _reset()

    return({'success': False})

def _reset():
    Vote.query.delete()
    Task.query.delete()

    for user in User.query.all():
        db.session.delete(user)
        db.session.commit()
        new_user = User(id=user.id, token=user.token, username=user.username)
        db.session.add(new_user)

    db.session.commit()

    # populate()
    change_game_state('lobby')
    cron.remove_all_jobs()
    return({'success': True})

@app.route('/api/test', methods=['POST', 'GET'])
def test_api():
    return """
    <h1>API is online!</h1>
    <script src="//cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.js" integrity="sha256-yr4fRk/GU1ehYJPAs8P4JlTgu0Hdsp4ZKrx8bDEDC3I=" crossorigin="anonymous"></script>
    <script type="text/javascript" charset="utf-8">
    var socket = io("http://192.168.0.30:5000");
    socket.on('connect', function() {
        socket.emit('test', {data: 'Im connected!'});
    });
    </script>
    """

@app.route('/api/check_connection', methods=['POST'])
def check_connection():
    return {'success': True}

@app.route('/api/add_console', methods=['POST'])
def add_console():
    return _add_console(request)


@app.route('/api/add_user', methods=['POST'])
def add_user():
    return _add_user(request)


def _add_console(request):
    """
    add console to db
    """

    token = str(uuid4())

    location = request.json.get('location')
    console_type = request.json.get('type')

    if location is None or location == '':
        return {
            'success': False,
            'reason': 'Console location cannot be empty.'
        }

    if Console.query.filter_by(location=location).first() is not None:
        return {
            'success': False,
            'reason': 'Console location already exist.'
        }

    if Console.query.filter_by(console_type='Meeting Room').first() is not None and console_type == 'Meeting Room':
        return {
            'success': False,
            'reason': 'Meeting Room console already exist. There can only be one meeting room.'
        }

    console = Console(
        token=token, 
        location=location, 
        console_type=console_type, 
        join_time=datetime.datetime.now()
        )
    db.session.add(console)
    db.session.commit()

    # update all existing user in the lobby
    lobby_update()

    print(Console.query.all())

    return {
        'success': True,
        'token': token
    }

@app.route('/api/delete', methods=['POST'])
def delete():
    """
    Delete console or user
    """

    if request.json.get('class') == 'player':
        database = User
    elif request.json.get('class') == 'console':
        database = Console


    item = database.query.filter_by(token=request.json.get('token')).first()
    if item is None:
        return (
            {'success': False}
        )

    db.session.delete(item)
    db.session.commit()

    lobby_update()

    return(
        {'success': True}
    )


@app.route('/api/game_settings', methods=['POST'])
def update_game_settings():
    """
    Update settings of the game from meeting room interface
    """

    reasons = []
    data = request.json

    print("update game settings:", data)

    quantities = ['num_imposters', 'meeting_duration', 'voting_duration', 'kill_countdown', 'num_task_per_player']
    max_val = [3, 1000, 1000, 60, 10]

    for (q, m) in zip(quantities, max_val):

        if data.get(q) is None or data.get(q) == "":
            reasons.append(f'{q} cannot be None')
        elif not data.get(q).isnumeric():
            reasons.append(f'{q} must be numeric')
        elif not 1 <= int(data.get(q)) <= m:
            reasons.append(f'{q} must be less than {m} and more than or equal to 1')
        else:
            game_settings[q] = int(data.get(q))

    # booleans
    quantities = ['confirm_ejection']

    for q in quantities:

        if data.get(q) is None:
            reasons.append(f'{q} cannot be None')
        elif not data.get(q) in ['true', 'false']:
            reasons.append(f'{q} must be boolean')
        else:
            game_settings[q] = True if data.get(q) == 'true' else False

    if len(reasons) > 0:
        return ({'success': False, 'reason': reasons})

    # update all existing user in the lobby
    lobby_update()

    return (
        {'success': True}
    )

@app.route('/api/kill', methods=['POST'])
def kill():
    """
    Register player as dead
    """
    token = request.json.get('token')

    if auth(token):
        player = User.query.filter_by(token=token).first()

        _kill(player)

        return({'success': True})

    return({'success': False})


def win(who):
    global winner
    winner = who
    change_game_state('end')
    print(who, 'has won')

@app.route('/api/who_won', methods=['POST'])
def who_won():
    if game_state == "end":
        return {'success':True, 'who': winner, 'imposters': [e.username for e in User.query.filter_by(is_imposter=True).all()]}
    else:
        return {'success':False, 'state': game_state, 'who':None, 'imposters': []}

def check_win():
    """
    Check if imposters have won
    """

    num_players_alive = User.query.filter_by(is_imposter=False).filter_by(dead=False).count()
    num_imposter_alive = User.query.filter_by(is_imposter=True).filter_by(dead=False).count()

    print(num_imposter_alive, num_players_alive)

    if num_imposter_alive >= num_players_alive:
        win('imposters')

    if num_imposter_alive == 0:
        win('crewmates')


def _kill(player):
    """
    kill player
    """
    # set to dead
    player.dead = True

    next_task = Task.query.get(player.next_task)
    
    # free up the assigned allocation
    if next_task is not None:

        # if the player is expecting a partner
        if next_task.assigned == 2:
            other_player = User.query.filter_by(next_task=next_task.id).filter(User.token!=player.token).first()
            if other_player is not None:
                assign_dummy(other_player, inherit_from=next_task.id, random_task_type=False)
                next_task.assigned -= 1

        next_task.assigned -= 1
    
        if next_task.dummy:
            cron.remove_job("dummy" + player.token)
            db.session.delete(next_task)

    player.next_task = None
    db.session.commit()

    check_win()
    
    uncompleted = Task.query.filter_by(completed=False)
    assigned = uncompleted.filter_by(assigned=2).filter_by(dummy=False)
    awaiting = uncompleted.filter_by(assigned=1).filter_by(dummy=False)
    dummies = Task.query.filter_by(dummy=True)

    print(assigned.count(), dummies.count())
    if assigned.count() == 0 and dummies.count() == 0:
        task = random.choice(awaiting.all())
        player = User.query.filter_by(next_task=task.id).first()
        assign_dummy(player, inherit_from=task.id, random_task_type=False)
        task.assigned -= 1
    db.session.commit()

    lobby_update()

@app.route('/api/trigger_meeting', methods=['POST'])
def trigger_meeting():
    token = request.json.get('token')
    meeting_type = request.json.get('meeting_type')
    if game_state == "meeting":
        return ({'success': False})

    if meeting_type == "emergency":
        console = Console.query.filter_by(token=token).first()
        if console.console_type != "Meeting Room":
            return ({'success': False})

    elif meeting_type == "report":
        if not auth(token):
            return ({'success': False})
        
    else:
        return ({'success': False})

    change_game_state('meeting')
    change_meeting_state('start')
    return ({'success': True})


@app.route('/api/start_meeting', methods=['POST'])
def start_meeting():
    _start_meeting(request.json.get('token'))
    return {'success': True}

@app.route('/api/register_vote', methods=['POST'])
def register_vote():
    token = request.json.get('token')
    vote_for_id = request.json.get('vote_for_id')

    print(token, vote_for_id)
    if auth(token):
        user = Vote.query.filter_by(token=token).first()
        user.vote_for = Vote.query.get(vote_for_id).token
        db.session.commit()
        broadcast_meeting_state()
        return {'success': True}

    return {'success': False}

def tally_votes():
    tally = []

    for candidate in Vote.query.all():
        vote_for = User.query.filter_by(token=candidate.vote_for).first()
        if vote_for is not None:
            vote_for_un = vote_for.username
        else:
            vote_for_un = None
        tally.append({
            'username': candidate.username,
            'id': candidate.id, 
            'vote_for': vote_for_un,
            'tally': Vote.query.filter_by(vote_for=candidate.token).count(),
            })

    return tally

def broadcast_meeting_state(sid=None):
    socketio.emit(
        'meeting update', 
        {
            'tally': tally_votes(), 
            'meeting_state': meeting_state,
            'discussion_end': time.mktime(discussion_end.timetuple())*1000,
            'voting_end': time.mktime(voting_end.timetuple())*1000,
        }, room=sid)


def broadcast_reactor_state():
    socketio.emit(
        'reactor update',
        {
            'reactor_state': reactor_state,
            'reactor_expire': time.mktime(reactor_expire.timetuple())*1000,
            'reactor_meltdown_duration': game_settings['reactor_meltdown_duration'],
            'passage': reactor_passage
        }
    )

@app.route('/api/end_meeting', methods=['POST'])
def end_meeting():
    token = request.json.get('token')

    console = Console.query.filter_by(token=token).filter_by(console_type="Meeting Room").first()

    if console is None:
        return {'success': False}

    change_meeting_state('end')

    tally = tally_votes()

    most_voted = max(tally, key=lambda e: e['tally'])
    duplicates = len([e for e in tally if e['tally'] == most_voted['tally']])
    num_imposter_alive = User.query.filter_by(is_imposter=True).filter_by(dead=False).count()

    if duplicates == 1 and most_voted['tally'] >= 3:
        most_voted = User.query.get(most_voted['id'])
        _kill(most_voted)
        
        if game_settings['confirm_ejection']:
            message = f"{most_voted.username} {'was' if most_voted.is_imposter else 'was not'} an imposter."
            if most_voted.is_imposter:
                message += f"\n{num_imposter_alive - 1} remaining."
            else:
                message += f"\n{num_imposter_alive} remaining."
        else:
            message = f"{most_voted.username} was ejected."
    else:
        message = "No one was ejected (draw)."

    print(message)
    socketio.emit('end meeting message', {'message': message})

    return {'success': True}

def _start_meeting(token):
    change_game_state('meeting')
    # clear data
    Vote.query.delete()
    # add columns
    for user in User.query.filter_by(dead=False).all():
        vote = Vote(id=user.id, token=user.token, username=user.username)
        if user.token == token:
            vote.called_meeting = True
        db.session.add(vote)
    
    db.session.commit()



    # schedule end of meeting and beginning of vote
    global discussion_end
    discussion_end = datetime.datetime.now() + datetime.timedelta(0, game_settings['meeting_duration'])

    cron.add_job(
        func=change_meeting_state,
        args=(['vote']), 
        trigger="date", 
        run_date=discussion_end,
        id="vote_trigger",
        replace_existing=True,
        max_instances=1
    )

    # schedule end of voting
    global voting_end
    voting_end = discussion_end + datetime.timedelta(0, game_settings['voting_duration'])

    print(time.mktime(discussion_end.timetuple()), time.mktime(voting_end.timetuple()))

    cron.add_job(
        func=change_meeting_state,
        args=(['reveal']), 
        trigger="date", 
        run_date=voting_end,
        id="reveal_trigger",
        replace_existing=True,
        max_instances=1
    )

    change_meeting_state('discussion')

@app.route('/api/validate_code', methods=['POST'])
def validate_code():
    token = request.json.get('token')
    secret_code = request.json.get('secret_code')

    player = User.query.filter_by(token=token).first()
    if player is None:
        return ({'success': False, 'reason': 'Something went wrong.'})

    # imposter receives the code
    if player.is_imposter:
        task = Task.query.filter_by(secret_code=secret_code).first()
        if task is None:
            return ({'success': False, 'reason': 'Code is wrong.'})
        else:
            receiver = User.query.filter_by(next_task=task.id).filter_by(task_type="receiver").first()
            if receiver is not None:
                assign_dummy(receiver, inherit_from=task.id, random_task_type=False)

    else:
        task = Task.query.get(player.next_task)

    if task is None:
        return ({'success': False, 'reason': 'Something went wrong.'})

    if task.dummy:
        return ({'success': False, 'reason': 'Code is wrong.'})

    # compare it with universal keys
    imposter = User.query.filter_by(universal_key=secret_code).first()
    
    if imposter is None:
        if task.secret_code != secret_code or task.dummy:
            return ({'success': False, 'reason': 'Code is wrong.'})
    else:
        # imposter is sender
        sender = User.query.filter_by(next_task=task.id).filter_by(task_type="sender").first()
        if sender is not None:
            assign_dummy(sender, inherit_from=task.id, random_task_type=False)

    _complete_task(task.id)

    return ({'success': True})
    

@app.route('/api/sabotage', methods=['POST'])
def sabotage():
    if game_state != "game":
        return {'success': False}

    global sabotage_expire

    if datetime.datetime.now() < sabotage_expire:
        return {'success': False}

    token = request.json.get('token')
    player = User.query.filter_by(token=token).first()

    if player is None:
        return {'success': False}

    if not player.is_imposter:
        return {'success': False}

    if request.json.get('type') == 'dummify':
        _dummify()
    elif request.json.get('type') == 'meltdown':
        _core_meltdown()

    sabotage_expire = datetime.datetime.now() + datetime.timedelta(0, game_settings['sabotage_cooldown'])

    lobby_update()
    for player in User.query.filter_by(is_imposter=True).filter_by(dead=False).all():
        send_task_update(player)

    return {'success': True}

@app.route('/api/save_core', methods=['POST'])
def save_core():
    token = request.json.get('token')
    console = Console.query.filter_by(token=token).filter_by(console_type='Reactor').first()

    if console is None:
        return {'success': False}
    else:
        cron.remove_job('reactor warning')
        cron.remove_job('reactor explode')
        change_reactor_state('normal')
        return {'success': True}

def _core_meltdown():
    
    global reactor_passage
    with open('random_sentences.txt') as f:
        reactor_passage = random.choice(f.read().splitlines())
        print(reactor_passage)

    change_reactor_state('trigger')
    # warn players in regular intervals
    interval = 2
    cron.add_job(
        func=change_reactor_state,
        args=(['warn']), 
        trigger="interval", 
        start_date=datetime.datetime.now(),
        end_date=datetime.datetime.now() + datetime.timedelta(0, game_settings['reactor_meltdown_duration']),
        seconds=interval,
        id="reactor warning"
    )

    
    cron.add_job(
        func=change_reactor_state,
        args=(['explode']), 
        trigger="date", 
        run_date=reactor_expire,
        id="reactor explode"
    )

def _dummify():

    alive_crewmates = User.query.filter_by(dead=False).filter_by(is_imposter=False).all()
    random.shuffle(alive_crewmates)
    
    for i in range(len(alive_crewmates) // 2):
        player = alive_crewmates[i]
        next_task = Task.query.get(player.next_task)
        next_task.assigned -= 1
        if next_task is not None and not next_task.dummy:
            assign_dummy(player, inherit_from=next_task.id, random_task_type=False)
    db.session.commit()


@app.route('/api/player_profile', methods=['POST'])
def player_profile():
    """
    Ask the API if i am the imposter or not. If i am, return the list of imposters.
    """
    token = request.json.get('token')

    if auth(token):
        player = User.query.filter_by(token=token).first()
        profile = {
            'username': player.username,
            'success': True,
            'next_task': player.next_task,
            'is_imposter': False,
            'id': player.id,
            'dead': player.dead,
            'type': 'player',
            'game_state': game_state
        }

        if player.is_imposter:
            profile['is_imposter'] = True
            profile['imposter_list'] = [e.username for e in imposter_list]
            profile['sabotage_expire'] = time.mktime(sabotage_expire.timetuple()) * 1000
        
        return profile
    elif auth_console(token):
        console = Console.query.filter_by(token=token).first()
        return {'success': True, 'type': 'console', 'game_state': game_state, 'console_type': console.console_type}

    return({'success': False})

def _add_user(request):
    """
    Add user to database
    """

    # generate user token
    token = str(uuid4())

    # get username
    username = request.json.get('username')

    # sanitize
    username = username.lstrip().rstrip()

    # username is none error
    if username is None or username == '':
        return {
            'success': False,
            'reason': 'Username cannot be empty.'
        }

    # username taken error
    if User.query.filter_by(username=username).first() is not None:
        return {
            'success': False,
            'reason': f'Username {username} is taken.'
        }

    # create user object
    user = db.relationship("User")
    user = User(
        token=token, 
        username=username, 
        join_time=datetime.datetime.now(), 
        is_imposter=False, 
        online=False
    )

    # add and commit
    db.session.add(user)
    db.session.commit()

    print(User.query.all())

    # update all existing user in the lobby
    lobby_update()


    # return success and token
    return {'success': True, 'token': token}

def change_reactor_state(*args):
    global reactor_state
    reactor_state = args[0]
    if reactor_state == "trigger":
        global reactor_expire
        reactor_expire = datetime.datetime.now() + datetime.timedelta(0, game_settings['reactor_meltdown_duration'])
    
    elif reactor_state == "explode":
        win('imposters')
    broadcast_reactor_state()

    print("changing reactor state to", reactor_state)



def change_meeting_state(*args):
    state = args[0]
    print('changing meeting state to', state)
    global meeting_state
    meeting_state = state

    if meeting_state == "end":
        # query incomplete tasks
        incomplete_task = Task.query.filter_by(completed=False)
        incomplete_task_count = incomplete_task.count()

        # delete incomplete tasks
        incomplete_task.delete()

        # create new tasks
        create_tasks(incomplete_task_count)

        # assign task to players
        assign_task()

        db.session.commit()

    elif meeting_state == "start":

        Task.query.filter_by(dummy=True).delete()
        db.session.commit()

    broadcast_meeting_state()
    return True


def change_game_state(*args):
    state = args[0]
    print('changing state')
    global game_state
    game_state = state

    if state == "game":
        change_reactor_state("normal")

    socketio.emit('change state', {'state': state})
    lobby_update()
    return True


def generate_random_code():
    return str(random.randint(10000000, 99999999))

def assign_imposters():
    num_imposters = game_settings['num_imposters']
    global imposter_list
    imposter_list = random.sample(User.query.all(), k=num_imposters)

    # reset
    for user in User.query.all():
        user.is_imposter = False

    for imposter in imposter_list:
        imposter.is_imposter = True
        imposter.universal_key = generate_random_code()

    db.session.commit()

def create_tasks(total_tasks=None):
    
    # non specified
    if total_tasks is None:
        total_tasks = len(User.query.all()) * game_settings['num_task_per_player'] 

        # clear task table
        Task.query.delete()

    # assign random task
    for i in range(total_tasks):
        task = Task(room=random.choice(room_list), secret_code=generate_random_code())
        db.session.add(task)

    # commit to change
    db.session.commit()
    print(Task.query.all())

def dummy_timeout(token, task_id):
    user = User.query.filter_by(token=token).first()
    task = Task.query.get(task_id)
    
    if task is not None:
        task.assigned -= 1
        db.session.delete(task)

    if user is not None:
        print('dummy timeout for', user.username)
        user.num_task_completed += 1
        user.next_task = None
        if user.sid is not None:
            socketio.emit('task complete', {'token': user.token, 'dummy': True}, room=user.sid)

    db.session.commit()

    # reassign tasks
    assign_task([user])

    lobby_update()

def add_dummy_task(token, task_id, duration=120):

    execute_time = datetime.datetime.now() + datetime.timedelta(0, duration)

    cron.add_job(
        func=dummy_timeout,
        args=([token, task_id]), 
        trigger="date", 
        run_date=execute_time,
        id="dummy"+token,
        replace_existing=True,
        max_instances=1
    )

def assign_dummy(user, inherit_from=None, random_task_type=True):
    if inherit_from is None:
        name = random.choice(room_list)
        secret_code = generate_random_code()
    else:
        inherit_task = Task.query.get(inherit_from)
        name = inherit_task.room
        secret_code = inherit_task.secret_code
    
    task = Task(dummy=True, room=name, secret_code=secret_code)
    db.session.add(task)
    db.session.commit()
    print(task)

    user.next_task = task.id
    if random_task_type:
        u = random.random()
        user.task_type = "receiver" if u > 0.5 else "sender"

    task.assigned += 1
    db.session.commit()

    if game_state == "game":
        send_task_update(user)

    # normally distributed
    # duration = norm.rvs(loc=game_settings['dummy_cooldown_mu'], scale=game_settings['dummy_cooldown_sigma'])
    duration = uniform.rvs(
        loc=game_settings["dummy_cooldown_min"], 
        scale=game_settings["dummy_cooldown_max"] - game_settings["dummy_cooldown_min"])

    print('assigning dummy for', duration)

    add_dummy_task(user.token, task.id, duration=int(duration))




def assign_task(users="all"):
    """
    Assign task to users
    """

    uncompleted_tasks = Task.query.filter_by(completed=False).filter_by(dummy=False)
    
    if users == "all":
        users = User.query.filter_by(dead=False).all()

    if len(uncompleted_tasks.all()) == 0:
        # no more task to assign
    
        return False

    users = [e for e in users if not e.is_imposter]
    random.shuffle(users)

    # assign dummies
    num_dummies = binom.rvs(len(users), game_settings['prob_dummy'])

    print("num_dummies", num_dummies)

    for i in range(int(num_dummies)):
        if len(users) == 0:
            break

        user = users.pop(0)
        assign_dummy(user)


    unassigned = uncompleted_tasks.filter_by(assigned=0).all()
    awaiting = uncompleted_tasks.filter_by(assigned=1).all()
    assigned = uncompleted_tasks.filter_by(assigned=2).all()


    to_fill =  max(game_settings['max_concurrent_tasks'] - len(assigned), 0)

    # fill awaiting
    for i, task in zip(range(to_fill), awaiting):
        if len(users) == 0:
            break
        user = users.pop(0)
        task = awaiting[i]
        
        other_user = User.query.filter_by(next_task=task.id).first()
        
        user.next_task = task.id

        if other_user.task_type == "sender":
            user.task_type = "receiver"
        elif other_user.task_type == "receiver":
            user.task_type = "sender"

        if game_state == "game":
            send_task_update(user)

        task.assigned += 1
        to_fill -= 1

    # fill both
    for i in range(to_fill):
        if len(unassigned) == 0:
            break

        if len(users) < 2:
            break

        user1 = users.pop(0)
        user2 = users.pop(0)

        task = unassigned.pop(0)
        user1.next_task = task.id
        user2.next_task = task.id

        user1.task_type = "receiver"
        user2.task_type = "sender"

        if game_state == "game":
            send_task_update(user1)
            send_task_update(user2)

        task.assigned += 2

    # fill one
    for task in unassigned:
        if len(users) == 0:
            break

        user = users.pop(0)

        user.next_task = task.id
        u = random.random()
        user.task_type = "receiver" if u > 0.5 else "sender"

        if game_state == "game":
            send_task_update(user)

        task.assigned += 1

    db.session.commit()

    

    return True

def send_task_update(user):
    if user.is_imposter and user.sid:
        data = {
            'username': user.username,
            'next_task': -1,
            'room': random.choice(room_list),
            'task_type': 'sender',
            'secret_code': user.universal_key,
            'sabotage_expire': time.mktime(sabotage_expire.timetuple()) * 1000
        }
        socketio.emit("task update", data, room=user.sid)
        return


    if user.sid:
        print('sending task update')
        task = Task.query.get(user.next_task)
        if task is None:
            return
        data = {
            'username': user.username,
            'next_task': user.next_task,
            'room': task.room,
            'task_type': user.task_type
            }

        if user.task_type == "sender":
            data['secret_code'] = task.secret_code

        socketio.emit("task update", data, room=user.sid)




@app.route('/api/complete_task', methods=['POST'])
def complete_task():
    """
    Mark task as completed WITHOUT verification
    """
    return _complete_task(request.json.get('task_id'))


def _complete_task(task_id):

    task = Task.query.get(task_id)
    users = User.query.filter_by(next_task=task_id).all()

    task.assigned = 0

    for user in users:
        user.num_task_completed += 1
        user.next_task = None

        completed_tasks = Task.query.filter_by(completed=True).filter_by(dummy=False).count()
        total_tasks = Task.query.filter_by(dummy=False).count()

        if not task.dummy:
            completed_tasks += 1

        if completed_tasks == total_tasks:
            win('crewmates')
        
        if user.sid is not None:
            socketio.emit('task complete', {'token': user.token, 'dummy':False}, room=user.sid)

    task.completed = True
    db.session.commit()

    # reassign tasks
    assign_task(users)

    lobby_update()

    return ({'success': True})


@app.route('/api/change_state', methods=['POST'])
def change_state_api():
    token = request.json.get('token')

    if auth_console(token):
        change_game_state(request.json.get('state'))

    return {'success': True}

@app.route('/api/start_game', methods=['POST'])
def start_game():



    # get token from  POST data
    token = request.json.get('token')

    # validate that it is the meeting room
    console = Console.query.filter_by(token=token).first()
    print('starting game...')
    if token != "dev":
        if console is None:
            return (
                {'success': False}
            )
        if console.console_type != "Meeting Room":
            return (
                {'success': False}
            )
        
    duration = int(request.json.get('duration'))
    time_now = datetime.datetime.now()
    execute_time = time_now + datetime.timedelta(0, duration)

    # emit start game signal
    socketio.emit (
        'start game', 
        {
            'time': time.mktime(time_now.timetuple())*1000, 
            'countdown': duration
        }
    )

    # clear tasks
    for user in User.query.all():
        user.next_task = None

    db.session.commit()

    
    cron.add_job(
        func=change_game_state,  
        args=(['game']), 
        trigger="date", 
        run_date=execute_time,
        id="game-state",
        replace_existing=True,
        max_instances=1
    )

    assign_imposters()
    create_tasks()
    assign_task()
    # lobby_update()
    print(imposter_list)

    global sabotage_expire
    sabotage_expire = datetime.datetime.now()

    

    return (
        {'success': True}
    )


def auth(token):
    """
    See if the user is logged in
    """
    # user does not exist
    if User.query.filter_by(token=token).first() is None:
        return False
    return True

def auth_console(token):
    # backdoor
    if token == 'dev':
        return True

    if Console.query.filter_by(token=token).first() is None:
        return False
    return True

def lobby_update_list(l=None):
    if l is None:
        l = User.query.all()

    c = Console.query.all()

    return {
        'success': True, 
        'users': [
            {'name':e.username, 'token': e.token, 'online': e.online, 'id': e.id, 'dead': e.dead} for e in l
            ],
        'consoles': [
            {'location': e.location, 'type': e.console_type, 'online': e.online, 'token': e.token} for e in c
            ],
        'task_status':{'completed': Task.query.filter_by(completed=True).count(), 'total': Task.query.filter_by(dummy=False).count()},
        'game_settings': game_settings,
        'game_state': game_state,
        'reactor_state':reactor_state
        }

def full_list():
    l = User.query.all()
    c = Console.query.all()
    t = Task.query.all()

    return {
        'success': True, 
        'users': [
            {'name':e.username, 'token': e.token, 'online': e.online, 'id': e.id, 
            'is_imposter': e.is_imposter, 'dead': e.dead, 'sid': e.sid,
            'next_task': e.next_task, 'num_task_completed': e.num_task_completed, 'task_type': e.task_type
            } for e in l
            ],
        'consoles': [
            {'location': e.location, 'type': e.console_type, 'online': e.online, 'token': e.token} for e in c
            ],
        'tasks': [
            {'id': e.id, 'room': e.room, 'assigned': e.assigned, 'completed': e.completed, 'secret_code': e.secret_code, 'dummy': e.dummy} for e in t
        ],
        'game_settings': game_settings,
        'game_state': game_state
        }

def lobby_update(l=None):
    lobby_update_dev()
    socketio.emit('lobby update', lobby_update_list(l))

def lobby_update_dev():
    socketio.emit('lobby update dev', full_list(), room=dev_sid)

@socketio.on('test')
def test_socket_io(data):
    emit('something')
    print('recieved', data)



@socketio.on('go online')
def go_online(data):
    token = data.get('token')
    print("entity data:", data)
    if token == "dev":
        global dev_sid
        dev_sid = request.sid
        lobby_update()
        print("debug mode")
    
    elif auth(token) or auth_console(token):

        if data.get('class') == 'player':
            database = User
        elif data.get('class') == 'console':
            database = Console


        # add associated sid
        item = database.query.filter_by(token=token).first()
        if item is None:
            emit('lobby update', {'success': False})
            return
        item.sid = request.sid
        item.online = True
        db.session.commit()

        if game_state == "game" and data.get('class') == 'player':
            send_task_update(item)

        if game_state == "meeting":
            broadcast_meeting_state(item.sid)

        # update all existing user in the lobby
        lobby_update()
        print(item, 'connected')
    else:
        emit('lobby update', {'success': False})

@socketio.on('user list')
def user_list(data):
    """
    Return list of user as json object, if user is authorised

    Input:
        data: { token }

    Return:
        {success, user list}
    """

    token = data.get('token')


    if not auth(token) and not auth_console(token):
        emit('lobby update', {'success': False})

    # return list of users
    emit('lobby update', lobby_update_list())




@socketio.on('disconnect')
def disconnect():
    player = User.query.filter_by(sid=request.sid).first()
    console = Console.query.filter_by(sid=request.sid).first()
    if player:
        player.online = False
        db.session.commit()
        print(player.username, 'disconnected :(')

        lobby_update()
        # update all existing user in the lobby
        

    if console:
        console.online = False
        db.session.commit()
        print(console.location, 'disconnected :(')

        lobby_update()



if __name__ == '__main__':
    # populate(num_players=8, num_consoles=2)
    socketio.run(app, host='192.168.0.28', port=2000, certfile="cert.pem", keyfile="key.pem")
    # http_server = WSGIServer(('',5000), app, handler_class=WebSocketHandler)
    # http_server.serve_forever()