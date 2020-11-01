import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Main Menu',
      theme: ThemeData(
        primarySwatch: Colors.red,
      ),
      home: Home(),
    );
  }
}

class Home extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // This method is rerun every time setState is called, for instance as done
    // by the _incrementCounter method above.
    //
    // The Flutter framework has been optimized to make rerunning build methods
    // fast, so that you can just rebuild anything that needs updating rather
    // than having to individually change instances of widgets.
    return Scaffold(
      appBar: AppBar(
        // Here we take the value from the MyHomePage object that was created by
        // the App.build method, and use it to set our appbar title.
        title: Text('Welcome!'),
      ),
      body: Center(
        // Center is a layout widget. It takes a single child and positions it
        // in the middle of the parent.
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text('Select Mode:', style:TextStyle(fontSize: 30)),
            const SizedBox(height: 30),
            RaisedButton(
              onPressed: () {
                Navigator.push(
                  context, 
                  MaterialPageRoute(builder: (context) => PlayerSignin())
                  );                
              },
              child: const Text('Player', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(height: 30),
            RaisedButton(
              onPressed: () {
                Navigator.push(
                  context, 
                  MaterialPageRoute(builder: (context) => PlayerSignin())
                  );                
              },
              child: const Text('Terminal', style: TextStyle(fontSize: 20)),
            ),
          ],
        ),
      ),
    );
  }
}

class PlayerSignin extends StatelessWidget {
  @override
  Widget build(BuildContext context){
    return Scaffold(
        appBar: AppBar(
          // Here we take the value from the MyHomePage object that was created by
          // the App.build method, and use it to set our appbar title.
          title: Text('Welcome!'),
        ),
        body: Center(
          child: Container(
            width: 200.0,
            child: Column(
                mainAxisSize: MainAxisSize.min,
                children:<Widget>[
                TextFormField(
                decoration: InputDecoration(labelText: 'Name', border: const OutlineInputBorder())
                ),
                const SizedBox(height: 30),
                RaisedButton(
                  onPressed: (){},
                  child: const Text('Submit', style: TextStyle(fontSize:20))
                )
              ]
            )
          )
        )
    );
  }
}

