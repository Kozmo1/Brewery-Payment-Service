import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";

interface OrderResponse {
	UserId: number;
}

interface PaymentResponse {
	Id: number;
	OrderId: number;
	Amount: number;
	Status: string;
	ProcessedAt: string;
}

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

		const { orderId } = req.body;
		const headers = { Authorization: req.headers.authorization };

		try {
			const orderResponse = await axios.get<OrderResponse>(
				`${this.breweryApiUrl}/api/order/${orderId}`,
				{ headers }
			);
			if (req.user?.id !== orderResponse.data.UserId) {
				res.status(403).json({ message: "Unauthorized" });
				return;
			}

			const paymentData = {
				OrderId: orderId,
				Amount: req.body.amount,
				Status: "Pending", // Will be set to "Completed" by DB service
			};

			const response = await axios.post<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/process`,
				paymentData,
				{ headers }
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
			const headers = { Authorization: req.headers.authorization };
			const response = await axios.get<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/${req.params.paymentId}`,
				{ headers }
			);
			const orderResponse = await axios.get<OrderResponse>(
				`${this.breweryApiUrl}/api/order/${response.data.OrderId}`,
				{ headers }
			);
			if (req.user?.id !== orderResponse.data.UserId) {
				res.status(403).json({ message: "Unauthorized" });
				return;
			}
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
			const headers = { Authorization: req.headers.authorization };
			const paymentResponse = await axios.get<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/${req.params.paymentId}`,
				{ headers }
			);
			const orderResponse = await axios.get<OrderResponse>(
				`${this.breweryApiUrl}/api/order/${paymentResponse.data.OrderId}`,
				{ headers }
			);
			if (req.user?.id !== orderResponse.data.UserId) {
				res.status(403).json({ message: "Unauthorized" });
				return;
			}

			const refundData = { Amount: req.body.amount };
			const response = await axios.post<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/refund/${req.params.paymentId}`,
				refundData,
				{ headers }
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
