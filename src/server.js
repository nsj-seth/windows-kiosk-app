const app = require("./app");
require("./config/database");

const PORT = 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log("---------------------------------------");
  console.log("Lab Content Server");
  console.log("---------------------------------------");
  console.log("Status: Running");
  console.log(`Port: ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log("---------------------------------------");
});