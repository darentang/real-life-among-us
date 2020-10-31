import numpy as np
from pprint import pprint
import smtplib, ssl

smtp_server = "smtp.gmail.com"
port = 587

with open('email_login.txt', 'r') as f:
    sender_email = f.readline()[:-1]
    password = f.readline()[:-1]

with open('email_list.txt', 'r') as f:
    email_address = f.read().splitlines()

num_players = len(email_address)
num_imposters = 2
num_rooms = 5

player_idx = list(range(num_players))
player_rooms = dict(zip(player_idx, [[] for _ in range(num_players)]))

imposter_index = np.random.choice(player_idx, 2, replace=False)

room_list = [
    "Master Bedroom (30 sec)",
    "Master Bedroom Bathroom (20 sec)",
    "Master Bedroom Closet (10 sec)",
    "Upstair Study (30 sec)",
    "Daren's room (10 sec)",
    "Upstair bathroom (10 sec)",
    "Susum's Room (20 sec)",
    "Downstairs Study (30 sec)",
    "Living Room (10 sec)",
    "Game Room (20 sec)",
    "Dining Room (10 sec)",
    "Kitchen (10 sec)",
    "Laundry (20 sec)",
]

rooms = np.arange(1, len(room_list) + 1)

room_dict = dict(zip(rooms, room_list))



context = ssl.create_default_context()
with smtplib.SMTP(smtp_server, port) as server:
    server.ehlo()
    server.starttls(context=context)
    server.ehlo()
    server.login(sender_email, password)

    for i in imposter_index:
        player_rooms[i] = 'IMPOSTER\n'
        player_rooms[i] += 'The other imposter(s): ' + ' ,'.join([email_address[j] for j in imposter_index if j != i])


    for i, player in enumerate(player_idx):
        choice = np.random.choice(rooms, num_rooms, replace=False)
        if player not in imposter_index:
            player_rooms[player] = 'CREWMATE\n\nTasks\n\n'
            player_rooms[player] +=  '\n'.join(list(map(room_dict.__getitem__, choice)))
        else:
            player_rooms[player] +=  '\n\nFake Tasks\n\n' + '\n'.join(list(map(room_dict.__getitem__, choice)))

        text = "\n\nYour role: \n" +  player_rooms[player]
        print("sending " + email_address[i])
        print(text)
        server.sendmail(sender_email, email_address[i], text)
        

