<template>
    <v-list subheader>
    <v-subheader>Players:</v-subheader>
    <v-list-item v-for="player in players" :key="player.token">        
          <v-list-item-title v-text="player.name"></v-list-item-title>
    </v-list-item>
    </v-list>
</template>

<script>
  export default {
    name: 'Lobby',
    created() {
      this.players = [];
      this.$socket.emit('request_player_list');
    },
    data(){
      if (this.players == null){
        return {players:[]};
      } else {
        return{players:this.players};
      }
    },
    mounted() {
        this.sockets.subscribe('player_list_update', (data) => {
          if (data != null){
            console.log(data);
            this.players = data;
          }
        });
      },
  }
</script>