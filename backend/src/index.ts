import "dotenv/config";
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter, requireAuth, requireCsrfForWrites } from "./modules/auth";
import { ordersRouter } from "./modules/orders-routes";
import { customersRouter } from "./modules/customers-routes";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("A variavel JWT_SECRET e obrigatoria em producao.");
}

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origem CORS nao permitida."));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.use("/auth", authRouter);
app.use("/orders", requireAuth, requireCsrfForWrites, ordersRouter);
app.use("/customers", requireAuth, requireCsrfForWrites, customersRouter);

app.listen(env.port, () => {
  console.log(`Backend rodando em http://localhost:${env.port}`);
});
