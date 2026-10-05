function getServerStatus(req, res) {
    res.status(200).json({
      status: "online",
      serverName: "Arduino Lab Server",
      apiVersion: "1.0",
      timestamp: new Date().toISOString()
    });
  }
  
  module.exports = {
    getServerStatus
  };