import express from "express";
import cors from "cors";
import dotenv from "dotenv-safe";
import paymentRoutes from "./ports/rest/routes/payment";
import { config } from "./config/config";


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

dotenv.config({
    allowEmptyValues: true,
    path: `.env.${process.env.NODE_ENV || "local"}`,
    example: ".env.example",
});

const port = config.port;

app.use("/healthcheck", (req, res) => {
    res.send("Show me the money!");
});

app.use("/payment", paymentRoutes);

app.listen(port, () => {
    console.log(`Payment Service is up and running on port ${port}`);
});