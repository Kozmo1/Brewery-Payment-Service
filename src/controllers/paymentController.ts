import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth";

// Setting up interfaces to keep our data straight
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
	// Grabbing the Brewery API URL from config
	private readonly breweryApiUrl = config.breweryApiUrl;

	// This method processes a payment
	async processPayment(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		// Checking if the request passes validation
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		// Pulling orderId from the body
		const { orderId } = req.body;
		const headers = { Authorization: req.headers.authorization };

		try {
			// Hitting the Order API to check the order
			const orderResponse = await axios.get<OrderResponse>(
				`${this.breweryApiUrl}/api/order/${orderId}`,
				{ headers }
			);
			if (req.user?.id !== orderResponse.data.UserId) {
				// Nope, this isn’t your order
				res.status(403).json({ message: "Unauthorized" });
				return;
			}

			// Building the payment data
			const paymentData = {
				OrderId: orderId,
				Amount: req.body.amount,
				Status: "Pending", // DB service will flip this to Completed
			};

			// Sending the payment to the Payment API
			const response = await axios.post<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/process`,
				paymentData,
				{ headers }
			);
			// Sweet, payment went through
			res.status(201).json({
				message: "Payment processed successfully",
				payment: response.data,
			});
		} catch (error: any) {
			// Uh-oh, something broke
			console.error(
				"Error processing payment:",
				error.response?.data || error.message
			);
			// Telling the user it didn’t wor
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message || "Error processing payment",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	// This method checks a payment’s status
	async getPaymentStatus(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		// Gotta check if we even have a user
		if (!req.user?.id) {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		try {
			const headers = { Authorization: req.headers.authorization };
			// Grabbing the payment details from the Payment API
			const response = await axios.get<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/${req.params.paymentId}`,
				{ headers }
			);
			// Checking the order to make sure it’s the user’s
			const orderResponse = await axios.get<OrderResponse>(
				`${this.breweryApiUrl}/api/order/${response.data.OrderId}`,
				{ headers }
			);
			if (req.user.id !== orderResponse.data.UserId) {
				res.status(403).json({ message: "Unauthorized" });
				return;
			}
			// All good
			res.status(200).json(response.data);
		} catch (error: any) {
			// Something went wrong
			console.error(
				"Error fetching payment status:",
				error.response?.data || error.message
			);
			// Letting the user know we couldn’t find it
			res.status(error.response?.status || 404).json({
				message: error.response?.data?.message || "Payment not found",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	// This method refunds a payment
	async refundPayment(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		// Checking validation
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		if (!req.user?.id) {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		try {
			const headers = { Authorization: req.headers.authorization };
			// Grabbing the payment to check it out
			const paymentResponse = await axios.get<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/${req.params.paymentId}`,
				{ headers }
			);
			// Making sure the order belongs to the user
			const orderResponse = await axios.get<OrderResponse>(
				`${this.breweryApiUrl}/api/order/${paymentResponse.data.OrderId}`,
				{ headers }
			);
			if (req.user.id !== orderResponse.data.UserId) {
				// Can’t refund someone else’s payment
				res.status(403).json({ message: "Unauthorized" });
				return;
			}

			// Setting up the refund data
			const refundData = { Amount: req.body.amount };
			// Sending the refund request to the Payment API
			const response = await axios.post<PaymentResponse>(
				`${this.breweryApiUrl}/api/payment/refund/${req.params.paymentId}`,
				refundData,
				{ headers }
			);
			// Cool, refund’s done—
			res.status(200).json({
				message: "Refund processed successfully",
				refund: response.data,
			});
		} catch (error: any) {
			// Oops, refund didn’t work
			console.error(
				"Error processing refund:",
				error.response?.data || error.message
			);
			// Telling the user it didn’t go through
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message || "Error processing refund",
				error: error.response?.data?.errors || error.message,
			});
		}
	}
}
