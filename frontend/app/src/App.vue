<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
    <v-spacer></v-spacer>

    <v-toolbar-title>Hello</v-toolbar-title>
    <v-spacer></v-spacer>
    </v-app-bar>

    <v-main>
      <Login/>
      <Lobby/>
    </v-main>
  </v-app>
</template>

<script>
import Login from './components/Login';
import Lobby from './components/Lobby';

export default {
  name: 'App',

  components: {
    Login, Lobby,
  },

}
</script>
