const errorHandler = require("./middleware/errorHander")
const notFound = require("./middleware/notFound")
const express = require("express");
const cors = require("cors")
const corsOptions = require("./config/corsOptions")
const envConfig = require("./config/envConfig")
const credentials = require("./middleware/credentials")

const port = Number(envConfig.PORT);
const app = express();


app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ 
  extended: true
 }));
app.use(express.json());

app.use("/", require('./routes/speciesRoute'))
app.get("/", (req, res) => {
  res.send("Hello, this is the root endpoint!");
});

app.use(errorHandler);
app.use(notFound);


app.listen(port, () => {
  console.log(`App listening on port ${port}!`)
})
