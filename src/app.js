const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const apiRouter = require("./routes/index");

const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "Api is running" }));

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
