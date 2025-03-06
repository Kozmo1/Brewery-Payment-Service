import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";
import { PaymentController } from "../../../controllers/paymentController";
import { AuthRequest, verifyToken } from "../../../middleware/auth";

const router = express.Router();
const paymentController = new PaymentController();

router.post(
	"/process",
	verifyToken,
	body("orderId")
		.isInt({ min: 1 })
		.withMessage("Order ID must be a positive integer"),
	body("amount")
		.isFloat({ min: 0 })
		.withMessage("Amount must be a positive number"),
	(req: AuthRequest, res: Response, next: NextFunction) =>
		paymentController.processPayment(req, res, next)
);

router.get(
	"/status/:paymentId",
	verifyToken,
	(req: AuthRequest, res: Response, next: NextFunction) =>
		paymentController.getPaymentStatus(req, res, next)
);

router.post(
	"/refund/:paymentId",
	verifyToken,
	body("amount")
		.isFloat({ min: 0 })
		.withMessage("Amount must be a positive number"),
	(req: AuthRequest, res: Response, next: NextFunction) =>
		paymentController.refundPayment(req, res, next)
);

export = router;
