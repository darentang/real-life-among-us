import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import store from './store'
import VueSocketIO from 'vue-socket.io'
import Toasted from 'vue-toasted';

const host = 'http://192.168.0.28:5000/';

Vue.config.productionTip = false

Vue.use(Toasted);


// Lets Register a Global Toasts.
Vue.toasted.register('appError',
  (payload) => {
    if (!payload.message) {
      return "Message not definded."
    }
    return payload.message;
  },
  {
    type: 'error'
  });

Vue.toasted.register('appSuccess',
  (payload) => {
    if (!payload.message) {
      return "Message not definded."
    }
    return payload.message;
  }, {
  type: 'success'
});

Vue.toasted.register('appInfo',
  (payload) => {
    if (!payload.message) {
      return "Message not definded."
    }
    return payload.message;
  }, {
  type: 'info'
});


Vue.use(new VueSocketIO({
  debug: true,
  connection: host,
  vuex: {
    store,
    actionPrefix: 'SOCKET_'
  },
  // options: {'transport':'websocket'} //Optional options
}))


new Vue({
  vuetify,
  render: h => h(App),
}).$mount('#app')
