import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";
import { PaymentController } from "../../../controllers/paymentController";

const router = express.Router();
const paymentController = new PaymentController();

router.post("/process",
    body("orderId").notEmpty().withMessage("Order ID is required"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
    body("paymentMethod").isIn(["card", "paypal", "cash"]).withMessage("Payment method must be 'card', 'paypal', or 'cash'"),
    body("cardDetails.cardNumber").optional().isCreditCard().withMessage("Invalid card number"),
    body("cardDetails.expiry").optional().matches(/^(0[1-9]|1[0-2])\/\d{2}$/).withMessage("Expiry must be MM/YY"),
    body("cardDetails.cvc").optional().isLength({ min: 3, max: 4 }).withMessage("CVC must be 3 or 4 digits"),
    (req: Request, res: Response, next: NextFunction) => paymentController.processPayment(req, res, next)
   );

router.get("/status/:paymentId",
    (req: Request, res: Response, next: NextFunction) => paymentController.getPaymentStatus(req, res, next)
);

export = router;