import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "../config/config";
import { validationResult } from "express-validator";

export class PaymentController {
    private readonly breweryApiUrl = config.breweryApiUrl;

    public async processPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { orderId, amount, paymentMethod, cardDetails } = req.body;

        try {
            //validate payment method and card details
            if (paymentMethod === "card" && (!cardDetails || !cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv)) {
                res.status(400).json({ message: "Card details are required for card payments (card number, expiry, cvc)" });
                return;
            }
            //prepare payment request for database service
            const paymentRequest = {
                orderId,
                amount,
                paymentMethod,
                cardDetails: paymentMethod === "card" ? cardDetails : undefined,
                status: "pending",
                processedAt: new Date().toISOString(),
            };
            // call database service payments endpoint
            const response = await axios.post(`${this.breweryApiUrl}/api/payment/process`, paymentRequest);
            // on successful response, return the response from the database service
            res.status(201).json({
                message: "Payment processed successfully",
                data: response.data
            });
        } catch (error: any) {
            console.error("Error processing payment:", error.response?.data || error.message);
            res.status(error.response?.status || 500).json({
                message: error.response?.data?.message || "Error processing payment",
                error: error.response?.data?.errors || error.message
            });
        }
    }

    public async getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { paymentId } = req.params;
        try {
            // call database service payments endpoint
            const response = await axios.get(`${this.breweryApiUrl}/api/payment/${paymentId}`);
            // on successful response, return the response from the database service
            res.status(200).json(response.data);
        } catch (error: any) {
            console.error("Error getting payment status:", error.response?.data || error.message);
            res.status(error.response?.status || 500).json({
                message: error.response?.data?.message || "Error getting payment status",
                error: error.response?.data?.errors || error.message
            });
        }
    }
}