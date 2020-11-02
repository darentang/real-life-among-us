<template>
  <v-container>
    <v-row class="text-center">
      <v-col class="mb-4">
        <v-form v-model="valid" id="nameform" >
          <v-text-field
            v-model="name"
            :rules="nameRules"
            :counter="10"
            label="Name"
            required
            :disabled="submitted"
          ></v-text-field>
          <v-btn color="success" form="nameform" v-on:click="submit" :disabled="!valid||submitted">Submit</v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  export default {
    name: 'Login',
    data() {
        return{
            valid:false,
            submitted:false,
            name:'',
            nameRules:[
              v => this.check(v) || 'Name Taken',
              v => !!v || 'Name is required',
              v => v.length <= 10 || 'Name must be less than 10 characters',
            ]
        };
    },
    mounted() {
      this.submitted = false;
      this.sockets.subscribe('check_player_callback', (data) => {
        if (data != null){
          this.taken = !!data.data;
          this.taken = !this.taken;
          this.valid = !this.taken;
        }
      });
      this.sockets.subscribe('player_token_callback', (data) => {
        if (data != null){
          console.log(data);
          this.token = data.token;
          this.name = data.name;
          this.signin_time = data.time;
        }
      });
    },
    methods:{
      check: function(v){
        this.send_request(v);
        return !this.taken;
      },
      send_request: function(v){
        if (!this.submitted && v != null){
          if (this.$socket.disconnected) {
              this.$toasted.global.appError({message: "You are not connected to the server!"}).goAway(1200);
          } else {
              this.$socket.emit("check_player", {name:v});
          }
        }
      },
      submit: function(){
        console.log('submitting');
        this.submitted = true;
        this.$socket.emit("add_player", {name:this.name});
      }
    }
  }
</script>
