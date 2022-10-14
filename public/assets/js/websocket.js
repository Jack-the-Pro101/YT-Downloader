(function () {
  const loc = window.location;
  let url;
  if (loc.protocol === "https:") {
    url = "wss:";
  } else {
    url = "ws:";
  }
  url += "//" + loc.host;
  url += loc.pathname + "api/ws";

  const listeners = [];

  window.ws = {
    timeout: null,
    heartbeat: null,
    alive: false,
    socket: null,
    ping: null,

    addEventListener: (type, callback) => {
      listeners.push({
        type,
        callback,
      });

      window.ws.socket.addEventListener(type, callback);
    },
  };

  function disconnected() {
    window.ws.alive = false;

    connect();
  }

  function ping() {
    const init = Date.now();

    window.ws.socket.send(
      JSON.stringify({
        type: "ping",
        start: init,
      })
    );

    window.ws.timeout = setTimeout(() => {
      disconnected();
      clearTimeout(window.ws.timeout);
      window.ws.timeout = null;
    }, 5000);
  }

  function connect() {
    window.ws.socket = new WebSocket(url);

    window.ws.socket.addEventListener("message", (e) => {
      if (!window.ws.socket.OPEN) return;
      const data = JSON.parse(e.data);

      if (data.type === "ping") window.ws.ping = data.ping;

      clearTimeout(window.ws.timeout);
      window.ws.alive = true;
    });

    window.ws.socket.onopen = () => {
      if (window.ws.socket.OPEN) {
        console.log("Socket opened");

        clearInterval(window.ws.heartbeat);
        ping();
        window.ws.heartbeat = setInterval(ping, 5000);

        listeners.forEach((listener) => {
          window.ws.socket.addEventListener(listener.type, listener.callback);
        });
      }
    };
  }

  connect();
})();
