import dotenv from "dotenv-safe";

dotenv.config({
    allowEmptyValues: true,
    path: `.env.${process.env.NODE_ENV || "local"}`,
    example: ".env.example",
});

const ENVIROMENT = process.env.NODE_ENV || "development";
const BREWERY_API_URL = process.env.BREWERY_API_URL ?? "http://localhost:5089";
const PORT = process.env.PORT ?? "3003"; 

export interface Config {
    enviroment: string;
    breweryApiUrl: string;
    port: number;
}

export const config: Config = {
    enviroment: ENVIROMENT,
    breweryApiUrl: BREWERY_API_URL,
    port: parseInt(PORT, 10),
};