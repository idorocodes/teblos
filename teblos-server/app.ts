import express from "express";
import cors from "cors"
import morgan from "morgan"
import dotenv from "dotenv";
import router from "./routes/router.ts";
import error404 from "./middleware/error404.ts";

dotenv.config();
const app = express();

app.use(morgan("dev"));

app.use(cors());
app.use(express.json());
app.use(router);
app.use(error404);
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
