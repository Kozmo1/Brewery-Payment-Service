import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";

export class PaymentController {
	private readonly breweryApiUrl = config.breweryApiUrl;

	async processPayment(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		try {
			const response = await axios.post(
				`${this.breweryApiUrl}/api/payment/process`,
				req.body
			);
			res.status(201).json({
				message: "Payment processed successfully",
				payment: response.data,
			});
		} catch (error: any) {
			console.error(
				"Error processing payment:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message || "Error processing payment",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async getPaymentStatus(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const response = await axios.get(
				`${this.breweryApiUrl}/api/payment/${req.params.paymentId}`
			);
			res.status(200).json(response.data);
		} catch (error: any) {
			console.error(
				"Error fetching payment status:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 404).json({
				message: error.response?.data?.message || "Payment not found",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async refundPayment(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		try {
			const response = await axios.post(
				`${this.breweryApiUrl}/api/payment/refund/${req.params.paymentId}`,
				req.body
			);
			res.status(200).json({
				message: "Refund processed successfully",
				refund: response.data,
			});
		} catch (error: any) {
			console.error(
				"Error processing refund:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message || "Error processing refund",
				error: error.response?.data?.errors || error.message,
			});
		}
	}
}
