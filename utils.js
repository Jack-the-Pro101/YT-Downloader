exports.getWsClients = () => Array.from(websocket.getWss().clients);

exports.getWsClient = (id) => {
  return Array.from(websocket.getWss().clients).find((socket) => {
    return socket.id === id;
  });
};
